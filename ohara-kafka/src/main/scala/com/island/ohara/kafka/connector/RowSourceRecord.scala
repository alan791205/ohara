package com.island.ohara.kafka.connector

import com.island.ohara.data.Row
import org.apache.kafka.connect.data.Schema
import org.apache.kafka.connect.source.SourceRecord
import com.island.ohara.serialization.RowSerializer

import scala.collection.JavaConverters._

/**
  * A wrap to SourceRecord. Currently, only value schema and value are changed.
  */
class RowSourceRecord(sourcePartition: Map[String, _],
                      sourceOffset: Map[String, _],
                      topic: String,
                      partition: Int,
                      keySchema: Schema,
                      key: Any,
                      row: Row,
                      timestamp: Long)
    extends SourceRecord(
      if (sourcePartition == null) null else sourcePartition.asJava,
      if (sourceOffset == null) null else sourceOffset.asJava,
      topic,
      if (partition < 0) null else partition,
      keySchema,
      key,
      Schema.BYTES_SCHEMA,
      RowSerializer.to(row),
      if (timestamp < 0) null else timestamp
    ) {

  def this(sourcePartition: Map[String, _], sourceOffset: Map[String, _], topic: String, row: Row) {
    this(sourcePartition, sourceOffset, topic, -1, null, null, row, -1)
  }

  def this(sourcePartition: Map[String, _],
           sourceOffset: Map[String, _],
           topic: String,
           keySchema: Schema,
           key: Any,
           row: Row) {
    this(sourcePartition, sourceOffset, topic, -1, keySchema, key, row, -1)
  }

  def this(sourcePartition: Map[String, _],
           sourceOffset: Map[String, _],
           topic: String,
           partition: Int,
           keySchema: Schema,
           key: Any,
           row: Row) {
    this(sourcePartition, sourceOffset, topic, partition, keySchema, key, row, -1)
  }

  /**
    * DON'T call this method in RowSourceTask since the object you pass is converted to a specific kafka object.
    *
    * @return a kafka object
    */
  override def value(): AnyRef = super.value()
}