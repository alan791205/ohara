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
import spray.json.{JsString, JsValue, RootJsonFormat}

object ContainerApi {

  /**
    * the enumeration is referenced to container's status. one of created, restarting, running, removing, paused, exited, or dead.
    * see https://docs.docker.com/engine/reference/commandline/ps/#filtering for more information
    *
    */
  abstract sealed class ContainerState extends Serializable {
    // adding a field to display the name from enumeration avoid we break the compatibility when moving code...
    val name: String
  }

  object ContainerState {
    case object CREATED extends ContainerState {
      val name = "CREATED"
    }

    case object RESTARTING extends ContainerState {
      val name = "RESTARTING"
    }

    case object RUNNING extends ContainerState {
      val name = "RUNNING"
    }

    case object REMOVING extends ContainerState {
      val name = "REMOVING"
    }

    case object PAUSED extends ContainerState {
      val name = "PAUSED"
    }

    case object EXITED extends ContainerState {
      val name = "EXITED"
    }

    case object DEAD extends ContainerState {
      val name = "DEAD"
    }

    val all: Seq[ContainerState] = Seq(
      CREATED,
      RESTARTING,
      RUNNING,
      REMOVING,
      PAUSED,
      EXITED,
      DEAD
    )

    case object PENDING extends ContainerState {
      val name = "PENDING"
    }

    case object SUCCEEDED extends ContainerState {
      val name = "SUCCEEDED"
    }

    case object FAILED extends ContainerState {
      val name = "FAILED"
    }

    case object UNKNOWN extends ContainerState {
      val name = "UNKNOWN"
    }

    val k8sAll: Seq[ContainerState] = Seq(
      PENDING,
      RUNNING,
      SUCCEEDED,
      FAILED,
      UNKNOWN
    )
  }
  implicit val CONTAINER_STATE_JSON_FORMAT: RootJsonFormat[ContainerState] = new RootJsonFormat[ContainerState] {
    override def write(obj: ContainerState): JsValue = JsString(obj.name)
    override def read(json: JsValue): ContainerState = ContainerState.all
      .find(_.name == json.asInstanceOf[JsString].value)
      .getOrElse(throw new IllegalArgumentException(s"Unknown state name:${json.asInstanceOf[JsString].value}"))
  }

  final case class PortPair(hostPort: Int, containerPort: Int)
  implicit val PORT_PAIR_JSON_FORMAT: RootJsonFormat[PortPair] = jsonFormat2(PortPair)

  final case class PortMapping(hostIp: String, portPairs: Seq[PortPair])
  implicit val PORT_MAPPING_JSON_FORMAT: RootJsonFormat[PortMapping] = jsonFormat2(PortMapping)

  final case class ContainerInfo(nodeName: String,
                                 id: String,
                                 imageName: String,
                                 created: String,
                                 state: ContainerState,
                                 name: String,
                                 size: String,
                                 portMappings: Seq[PortMapping],
                                 environments: Map[String, String],
                                 hostname: String)
  implicit val CONTAINER_INFO_JSON_FORMAT: RootJsonFormat[ContainerInfo] = jsonFormat10(ContainerInfo)
}
