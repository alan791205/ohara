package com.island.ohara.kafka
import scala.concurrent.duration._

/**
  * a helper class used to create the kafka topic.
  * all member are protected since we have to implement a do-nothing TopicCreator in testing.
  */
abstract class TopicBuilder {
  protected var topicName: Option[String] = None
  protected var numberOfPartitions: Option[Int] = None
  protected var numberOfReplications: Option[Short] = None
  protected var topicOptions: Option[Map[String, String]] = Some(Map.empty[String, String])
  protected var timeout: Option[Duration] = Some(10 seconds)

  def topicName(topicName: String): TopicBuilder = {
    this.topicName = Some(topicName)
    this
  }

  def numberOfPartitions(partitions: Int): TopicBuilder = {
    this.numberOfPartitions = Some(partitions)
    this
  }

  def numberOfReplications(replication: Short): TopicBuilder = {
    this.numberOfReplications = Some(replication)
    this
  }

  def topicOptions(topicOptions: Map[String, String]): TopicBuilder = {
    this.topicOptions = Some(topicOptions)
    this
  }

  def timeout(timeout: Duration): TopicBuilder = {
    this.timeout = Some(timeout)
    this
  }

  def build(): Unit
}