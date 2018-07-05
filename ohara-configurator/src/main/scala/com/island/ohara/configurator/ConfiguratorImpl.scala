package com.island.ohara.configurator

import akka.actor.ActorSystem
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.{server, Http}
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.StandardRoute
import akka.stream.ActorMaterializer
import com.island.ohara.config.{OharaConfig, OharaJson}
import com.island.ohara.configurator.data.{OharaData, OharaException, OharaSchema, OharaTopic}
import com.island.ohara.configurator.kafka.KafkaClient
import com.island.ohara.configurator.store.Store
import com.island.ohara.io.CloseOnce
import com.typesafe.scalalogging.Logger

import scala.concurrent.Await
import scala.concurrent.duration.{Duration, _}

/**
  * A simple impl of Configurator. This impl maintains all subclass of ohara data in a single ohara store.
  * TODO: the store should be a special class providing the helper methods to iterate the specified sub-class of OharaData
  * @param hostname hostname of rest server
  * @param _port port of rest server
  * @param store store
  */
private class ConfiguratorImpl(uuidGenerator: () => String,
                               val hostname: String,
                               _port: Int,
                               val store: Store[String, OharaData],
                               kafkaClient: KafkaClient,
                               initializationTimeout: Duration,
                               terminationTimeout: Duration)
    extends Configurator {

  private val log = Logger(classOf[ConfiguratorImpl])

  private[this] def rejectNonexistentUuid(uuid: String) = complete(StatusCodes.BadRequest -> OharaException(
    new IllegalArgumentException(s"Failed to find a schema mapping to $uuid")).toJson.toString)

  private[this] def handleException(function: () => StandardRoute): StandardRoute = try function()
  catch {
    // Parsing the invalid request can cause the IllegalArgumentException
    case e: IllegalArgumentException => complete(StatusCodes.BadRequest -> OharaException(e).toJson.toString)
    // otherwise configurator may encounter some bugs
    case e: Throwable => {
      log.error("What happens here?", e)
      complete(StatusCodes.ServiceUnavailable -> OharaException(e).toJson.toString)
    }
  }

  private[this] def completeUuid(uuid: String) = complete("{\"uuid\":\"" + uuid + "\"}")

  /**
    * this route is used to handle the request to schema.
    */
  private[this] val schemaRoute = locally {

    val addSchema = pathEnd {
      post {
        entity(as[String]) { body =>
          handleException(() => {
            val schema = OharaSchema(uuidGenerator(), OharaJson(body))
            updateData(schema)
            completeUuid(schema.uuid)
          })
        }
      }
    }

    val listSchema = pathEnd(get(handleException(() => complete(listUuid[OharaSchema]))))

    val getSchema = path(Segment) { uuid =>
      {
        get {
          handleException(() =>
            getData[OharaSchema](uuid).map(r => complete(r.toJson.toString)).getOrElse(rejectNonexistentUuid(uuid)))
        }
      }
    }

    val deleteSchema = path(Segment) { uuid =>
      {
        delete {
          handleException(
            () =>
              removeData[OharaSchema](uuid)
                .map(data => complete(data.toJson.toString))
                .getOrElse(rejectNonexistentUuid(uuid)))
        }
      }
    }

    val updateSchema = path(Segment) { previousUuid =>
      {
        put {
          entity(as[String]) { body =>
            handleException(() => {
              getData[OharaSchema](previousUuid)
                .map(_ => {
                  val schema = OharaSchema(previousUuid, OharaJson(body))
                  // TODO: we should disallow user to reduce or reorder the column. by chia
                  updateData(schema)
                  completeUuid(previousUuid)
                })
                .getOrElse(rejectNonexistentUuid(previousUuid))
            })
          }
        }
      }
    }

    pathPrefix(Configurator.SCHEMA_PATH) {
      addSchema ~ listSchema ~ getSchema ~ deleteSchema ~ updateSchema
    }
  }

  private[this] val topicRoute = locally {

    val addTopic = pathEnd {
      post {
        entity(as[String]) { body =>
          handleException(() => {
            val topicInfo =
              OharaTopic(uuidGenerator(), OharaJson(body))
            if (kafkaClient.exist(topicInfo.uuid))
              // this should be impossible....
              throw new IllegalArgumentException(s"The topic:${topicInfo.uuid} exists")
            else {
              kafkaClient.topicCreator
              // NOTED: we use the uuid to create topic since we allow user to change the topic name arbitrary
                .topicName(topicInfo.uuid)
                .numberOfPartitions(topicInfo.numberOfPartitions)
                .numberOfReplications(topicInfo.numberOfReplications)
                .create()
              updateData(topicInfo)
              completeUuid(topicInfo.uuid)
            }
          })
        }
      }
    }

    val updateTopic = path(Segment) { previousUuid =>
      {
        put {
          entity(as[String]) { body =>
            handleException(() => {
              getData[OharaTopic](previousUuid)
                .map(previousTopic => {
                  val topic = OharaTopic(previousUuid, OharaJson(body))
                  if (previousTopic.numberOfReplications != topic.numberOfReplications)
                    throw new IllegalArgumentException("Non-support to change the number of replications")
                  if (previousTopic.numberOfPartitions != topic.numberOfPartitions)
                    kafkaClient.addPartition(previousUuid, topic.numberOfPartitions)
                  updateData(topic)
                  completeUuid(previousUuid)
                })
                .getOrElse(rejectNonexistentUuid(previousUuid))
            })
          }
        }
      }
    }

    pathPrefix(Configurator.TOPIC_PATH) {
      addTopic ~ updateTopic
    }
  }

  /**
    * the full route consists of all routes against all subclass of ohara data and a final route used to reject other requests.
    */
  private[this] val route: server.Route = pathPrefix(Configurator.VERSION)(schemaRoute ~ topicRoute) ~ path(Remaining)(
    _ => {
      // TODO: just reject? by chia
      reject
    })

  private[this] implicit val actorSystem = ActorSystem(s"${classOf[ConfiguratorImpl].getSimpleName}-system")
  private[this] implicit val actorMaterializer = ActorMaterializer()
  private[this] val httpServer: Http.ServerBinding =
    Await.result(Http().bindAndHandle(route, hostname, _port), initializationTimeout.toMillis milliseconds)

  override val port = httpServer.localAddress.getPort

  override def schemas: Iterator[OharaSchema] = iterateData[OharaSchema]

  /**
    * Do what you want to do when calling closing.
    */
  override protected def doClose(): Unit = {
    if (httpServer != null)
      CloseOnce.release(() => Await.result(httpServer.unbind(), terminationTimeout.toMillis milliseconds), true)
    if (actorSystem != null)
      CloseOnce.release(() => Await.result(actorSystem.terminate(), terminationTimeout.toMillis milliseconds), true)
    CloseOnce.close(store)
    CloseOnce.close(kafkaClient)
  }

  import scala.reflect._

  private[this] def listUuid[T <: OharaData: ClassTag](): String = {
    val rval = OharaConfig()
    rval.set("uuids", iterateData[T].map(d => (d.uuid -> d.name)).toMap)
    rval.toJson.toString
  }

  /**
    * Retrieve a "specified" sublcass of ohara data mapping the uuid. If the data mapping to the uuid is not the specified
    * type, the None will be returned.
    * @param uuid of ohara data
    * @tparam T subclass type
    * @return a subclass of ohara data
    */
  private[this] def getData[T <: OharaData: ClassTag](uuid: String): Option[T] =
    store.get(uuid).filter(classTag[T].runtimeClass.isInstance(_)).map(_.asInstanceOf[T])

  /**
    * Remove a "specified" sublcass of ohara data mapping the uuid. If the data mapping to the uuid is not the specified
    * type, the None will be returned.
    * @param uuid of ohara data
    * @tparam T subclass type
    * @return a subclass of ohara data
    */
  private[this] def removeData[T <: OharaData: ClassTag](uuid: String): Option[T] =
    getData[T](uuid).flatMap(d => store.remove(d.uuid).map(_.asInstanceOf[T]))

  /**
    * Update a "specified" sublcass of ohara data mapping the uuid. If the data mapping to the uuid is not the specified
    * type, the None will be returned.
    * @param data ohara data
    * @tparam T subclass type
    * @return a subclass of ohara data
    */
  private[this] def updateData[T <: OharaData: ClassTag](data: T): Option[T] =
    store.update(data.uuid, data).filter(classTag[T].runtimeClass.isInstance(_)).map(_.asInstanceOf[T])

  /**
    * Iterate the specified type. The unrelated type will be ignored.
    * @tparam T subclass type
    * @return iterator
    */
  private[this] def iterateData[T <: OharaData: ClassTag]: Iterator[T] = store.iterator
    .filter {
      case (_, data) => classTag[T].runtimeClass.isInstance(data)
    }
    .map {
      case (_, data) => data.asInstanceOf[T]
    }

  override def iterator: Iterator[OharaData] = store.map(_._2).iterator

  override def size = store.size
}