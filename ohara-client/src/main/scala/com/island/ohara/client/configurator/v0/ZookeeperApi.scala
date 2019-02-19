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
import spray.json.DefaultJsonProtocol._
import spray.json.{JsValue, RootJsonFormat}

object ZookeeperApi {
  val ZOOKEEPER_PREFIX_PATH: String = "zookeepers"

  /**
    * Create a basic request with default value.
    * @param name cluster name
    * @param nodeNames node names
    * @return request
    */
  def creationRequest(name: String, nodeNames: Seq[String]): ZookeeperClusterCreationRequest =
    ZookeeperClusterCreationRequest(
      name = name,
      imageName = None,
      clientPort = None,
      peerPort = None,
      electionPort = None,
      nodeNames = nodeNames
    )
  final case class ZookeeperClusterCreationRequest(name: String,
                                                   imageName: Option[String],
                                                   clientPort: Option[Int],
                                                   peerPort: Option[Int],
                                                   electionPort: Option[Int],
                                                   nodeNames: Seq[String])
      extends ClusterCreationRequest

  implicit val ZOOKEEPER_CLUSTER_CREATION_REQUEST_JSON_FORMAT: RootJsonFormat[ZookeeperClusterCreationRequest] =
    jsonFormat6(ZookeeperClusterCreationRequest)

  trait ZookeeperClusterInfo extends ClusterInfo {
    def clientPort: Int
    def peerPort: Int
    def electionPort: Int
    override def ports: Seq[Int] = Set(clientPort, peerPort, electionPort).toSeq
  }

  object ZookeeperClusterInfo {
    def apply(name: String,
              imageName: String,
              clientPort: Int,
              peerPort: Int,
              electionPort: Int,
              nodeNames: Seq[String]): ZookeeperClusterInfo = ZookeeperClusterInfoImpl(
      name = name,
      imageName = imageName,
      clientPort = clientPort,
      peerPort = peerPort,
      electionPort = electionPort,
      nodeNames = nodeNames
    )
  }

  implicit val ZOOKEEPER_CLUSTER_INFO_JSON_FORMAT: RootJsonFormat[ZookeeperClusterInfo] =
    new RootJsonFormat[ZookeeperClusterInfo] {
      override def read(json: JsValue): ZookeeperClusterInfo = ZOOKEEPER_CLUSTER_INFO_IMPL_JSON_FORMAT.read(json)

      override def write(obj: ZookeeperClusterInfo): JsValue =
        ZOOKEEPER_CLUSTER_INFO_IMPL_JSON_FORMAT.write(toCaseClass(obj))
    }

  private[this] def toCaseClass(obj: ZookeeperClusterInfo): ZookeeperClusterInfoImpl = obj match {
    case _: ZookeeperClusterInfoImpl => obj.asInstanceOf[ZookeeperClusterInfoImpl]
    case _ =>
      ZookeeperClusterInfoImpl(
        name = obj.name,
        imageName = obj.imageName,
        clientPort = obj.clientPort,
        peerPort = obj.peerPort,
        electionPort = obj.electionPort,
        nodeNames = obj.nodeNames
      )
  }

  private[this] case class ZookeeperClusterInfoImpl(name: String,
                                                    imageName: String,
                                                    clientPort: Int,
                                                    peerPort: Int,
                                                    electionPort: Int,
                                                    nodeNames: Seq[String])
      extends ZookeeperClusterInfo

  private[this] implicit val ZOOKEEPER_CLUSTER_INFO_IMPL_JSON_FORMAT: RootJsonFormat[ZookeeperClusterInfoImpl] =
    jsonFormat6(ZookeeperClusterInfoImpl)

  def access(): ClusterAccess[ZookeeperClusterCreationRequest, ZookeeperClusterInfo] =
    new ClusterAccess[ZookeeperClusterCreationRequest, ZookeeperClusterInfo](ZOOKEEPER_PREFIX_PATH)
}
