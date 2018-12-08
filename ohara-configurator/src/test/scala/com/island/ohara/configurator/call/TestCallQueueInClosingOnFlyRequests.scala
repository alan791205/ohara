package com.island.ohara.configurator.call

import com.island.ohara.client.ConfiguratorJson._
import com.island.ohara.common.data.DataType
import com.island.ohara.integration.With3Brokers
import com.island.ohara.kafka.KafkaUtil
import org.junit.Test
import org.scalatest.Matchers

import scala.concurrent.Await
import scala.concurrent.duration._
class TestCallQueueInClosingOnFlyRequests extends With3Brokers with Matchers {
  private[this] val requestData: SourceRequest =
    SourceRequest(name = "name",
                  className = "jdbc",
                  topics = Seq.empty,
                  numberOfTasks = 1,
                  schema = Seq(Column("cf", DataType.BOOLEAN, 1)),
                  configs = Map("a" -> "b"))

  @Test
  def test(): Unit = {
    val requestCount = 10
    val requestTopic = newTopic()
    val responseTopic = newTopic()
    val invalidClient: CallQueueClient[SourceRequest, Source] =
      CallQueue
        .clientBuilder()
        .brokers(testUtil.brokersConnProps)
        .requestTopic(requestTopic)
        .responseTopic(responseTopic)
        .build[SourceRequest, Source]()
    val requests = try 0 until requestCount map { _ =>
      invalidClient.request(requestData)
    } finally invalidClient.close()
    requests.foreach(Await.result(_, 15 seconds) match {
      case Left(exception) => exception.message shouldBe CallQueue.TERMINATE_TIMEOUT_EXCEPTION.getMessage
      case _               => throw new RuntimeException("All requests should fail")
    })
  }

  private[this] def newTopic(): String = {
    val name = random()
    KafkaUtil.createTopic(testUtil.brokersConnProps, name, 1, 1)
    name
  }
}