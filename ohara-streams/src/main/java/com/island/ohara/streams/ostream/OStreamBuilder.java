/*
 * Copyright 2019 is-land
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.island.ohara.streams.ostream;

import com.island.ohara.common.util.CommonUtil;
import com.island.ohara.streams.OStream;
import java.util.Objects;

@SuppressWarnings({"rawtypes", "unchecked"})
public final class OStreamBuilder<K, V> {

  private String bootstrapServers = null;
  private String appId = null;
  private String fromTopic = null;
  private Consumed fromSerde = null;
  private String toTopic = null;
  private Produced toSerde = null;
  private Class<? extends TimestampExtractor> extractor = null;
  private boolean cleanStart = false;

  private Serde<K> builderKeySerde;
  private Serde<V> builderValueSerde;

  public OStreamBuilder(Serde<K> key, Serde<V> value) {
    this.builderKeySerde = key;
    this.builderValueSerde = value;
  }

  /** For those who want to custom own serdes for from/to topic */
  private OStreamBuilder(OStreamBuilder builder) {
    this.bootstrapServers = builder.bootstrapServers;
    this.appId = builder.appId;
    this.fromTopic = builder.fromTopic;
    this.fromSerde = builder.fromSerde;
    this.toTopic = builder.toTopic;
    this.toSerde = builder.toSerde;
    this.extractor = builder.extractor;
    this.cleanStart = builder.cleanStart;
  }

  public OStreamBuilder<K, V> bootstrapServers(String bootstrapServers) {
    this.bootstrapServers = bootstrapServers;
    return this;
  }

  public OStreamBuilder<K, V> appid(String appId) {
    this.appId = appId;
    return this;
  }

  /**
   * set the topic consumed from. note the default {@code <key, value>} is {@code <Serdes.String,
   * Serdes.Row>}
   *
   * @param fromTopic the topic name
   */
  public OStreamBuilder<K, V> fromTopic(String fromTopic) {
    this.fromTopic = fromTopic;
    this.fromSerde = new Consumed<>(builderKeySerde, builderValueSerde);
    return this;
  }

  /**
   * set the topic consumed from by providing the serializer/de-serializer.
   *
   * @param fromTopic the topic name
   * @param key the serialize type for topic key
   * @param value the serialize type for topic value
   */
  public <S, U> OStreamBuilder<S, U> fromTopicWith(String fromTopic, Serde<S> key, Serde<U> value) {
    this.fromTopic = fromTopic;
    this.fromSerde = new Consumed<>(key, value);
    return new OStreamBuilder<>(this);
  }

  /**
   * set the topic produced to. note the default {@code <key, value>} is {@code <Serdes.String,
   * Serdes.Row>}
   *
   * @param toTopic the topic name
   */
  public OStreamBuilder<K, V> toTopic(String toTopic) {
    return toTopicWith(toTopic, builderKeySerde, builderValueSerde);
  }

  /**
   * set the topic produced from by providing the serializer/de-serializer.
   *
   * @param toTopic the topic name
   * @param key the serialize type for topic key
   * @param value the serialize type for topic value
   */
  public <S, U> OStreamBuilder<K, V> toTopicWith(String toTopic, Serde<S> key, Serde<U> value) {
    this.toTopic = toTopic;
    this.toSerde = new Produced<>(key, value);
    return this;
  }

  /** control this stream application should clean all state data before start. */
  public OStreamBuilder<K, V> cleanStart() {
    this.cleanStart = true;
    return this;
  }

  /**
   * define timestamp of fromTopic records.
   *
   * @param extractor class extends {@code TimestampExtractor}
   */
  public OStreamBuilder<K, V> timestampExactor(Class<? extends TimestampExtractor> extractor) {
    this.extractor = extractor;
    return this;
  }

  public OStream<K, V> build() {
    // Validation
    Objects.requireNonNull(this.bootstrapServers, "bootstrapServers should not be null");
    Objects.requireNonNull(this.fromTopic, "fromTopic should not be null");
    Objects.requireNonNull(this.toTopic, "targetTopic should not be null");

    // Default
    if (this.appId == null) {
      this.appId = CommonUtil.uuid() + "-streamApp";
    }

    return new OStreamImpl<>(this);
  }

  // Getters
  public String getBootstrapServers() {
    return bootstrapServers;
  }

  public String getAppId() {
    return appId;
  }

  public String getFromTopic() {
    return fromTopic;
  }

  public Consumed getFromSerde() {
    return fromSerde;
  }

  public String getToTopic() {
    return toTopic;
  }

  public Produced getToSerde() {
    return toSerde;
  }

  public Class<? extends TimestampExtractor> getExtractor() {
    return extractor;
  }

  public boolean isCleanStart() {
    return cleanStart;
  }
}
