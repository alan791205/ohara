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

package com.island.ohara.client.configurator.v0
import com.island.ohara.common.data.ConnectorState
import spray.json.DefaultJsonProtocol.{jsonFormat5, _}
import spray.json.RootJsonFormat

object PipelineApi {
  val UNKNOWN: String = "?"
  val PIPELINES_PREFIX_PATH: String = "pipelines"
  final case class PipelineCreationRequest(name: String, rules: Map[String, String])
  implicit val PIPELINE_REQUEST_JSON_FORMAT: RootJsonFormat[PipelineCreationRequest] = jsonFormat2(
    PipelineCreationRequest)

  final case class ObjectAbstract(id: String,
                                  name: String,
                                  kind: String,
                                  state: Option[ConnectorState],
                                  lastModified: Long)
      extends Data
  import com.island.ohara.client.configurator.v0.ConnectorApi.CONNECTOR_STATE_JSON_FORMAT
  implicit val OBJECT_ABSTRACT_JSON_FORMAT: RootJsonFormat[ObjectAbstract] = jsonFormat5(ObjectAbstract)

  final case class Pipeline(id: String,
                            name: String,
                            rules: Map[String, String],
                            objects: Seq[ObjectAbstract],
                            lastModified: Long)
      extends Data {
    override def kind: String = "pipeline"
  }
  implicit val PIPELINE_JSON_FORMAT: RootJsonFormat[Pipeline] = jsonFormat5(Pipeline)

  def access(): Access[PipelineCreationRequest, Pipeline] =
    new Access[PipelineCreationRequest, Pipeline](PIPELINES_PREFIX_PATH)
}
