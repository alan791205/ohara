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

package com.island.ohara.agent
import com.island.ohara.agent.Collie.ClusterCreator
import com.island.ohara.client.configurator.v0.ClusterInfo
import com.island.ohara.client.configurator.v0.ContainerApi.ContainerInfo
import com.island.ohara.common.annotations.Optional
import com.island.ohara.common.util.CommonUtil

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

/**
  * Collie is a cute dog helping us to "manage" a bunch of sheep.
  * @tparam T cluster description
  */
trait Collie[T <: ClusterInfo] {

  /**
    * remove whole cluster by specified name.
    * NOTED: Graceful downing whole cluster may take some time...
    * @param clusterName cluster name
    */
  def remove(clusterName: String): Future[T]

  /**
    * get logs from all containers
    * @param clusterName cluster name
    * @return all log content from cluster. Each container has a log.
    */
  def logs(clusterName: String): Future[Map[ContainerInfo, String]]

  /**
    * create a cluster creator
    * @return creator of broker cluster
    */
  def creator(): ClusterCreator[T]

  /**
    * get the containers information from a1 cluster
    * @param clusterName cluster name
    * @return containers information
    */
  def containers(clusterName: String): Future[Seq[ContainerInfo]] = cluster(clusterName).map(_._2)

  def clusters(): Future[Map[T, Seq[ContainerInfo]]]

  /**
    * get the cluster information from a broker cluster
    * @param name cluster name
    * @return cluster information
    */
  def cluster(name: String): Future[(T, Seq[ContainerInfo])] =
    clusters().map(_.find(_._1.name == name).getOrElse(throw new NoSuchElementException(s"$name doesn't exist")))

  /**
    * @param clusterName cluster name
    * @return true if the broker cluster exists
    */
  def exists(clusterName: String): Future[Boolean] = clusters().map(_.exists(_._1.name == clusterName))

  /**
    * @param clusterName cluster name
    * @return true if the broker cluster doesn't exist
    */
  def nonExists(clusterName: String): Future[Boolean] = exists(clusterName).map(!_)

  /**
    * add a node to a running broker cluster
    * NOTED: this is a async operation since graceful adding a node to a running service may be slow.
    * @param clusterName cluster name
    * @param nodeName node name
    * @return updated broker cluster
    */
  def addNode(clusterName: String, nodeName: String): Future[T]

  /**
    * remove a node from a running broker cluster.
    * NOTED: this is a async operation since graceful downing a node from a running service may be slow.
    * @param clusterName cluster name
    * @param nodeName node name
    * @return updated broker cluster
    */
  def removeNode(clusterName: String, nodeName: String): Future[T]
}

object Collie {
  trait ClusterCreator[T <: ClusterInfo] {
    protected var imageName: String = _
    protected var clusterName: String = _
    protected var nodeNames: Seq[String] = _

    /**
      * In route we accept the option arguments from restful APIs. This method help caller to apply fluent pattern.
      * @param imageName image name
      * @return this creator
      */
    @Optional("we have default image for each collie")
    def imageName(imageName: Option[String]): ClusterCreator.this.type = {
      imageName.foreach(this.imageName = _)
      this
    }

    def imageName(name: String): ClusterCreator.this.type = imageName(Some(name))

    def clusterName(clusterName: String): ClusterCreator.this.type = {
      this.clusterName = CommonUtil.assertOnlyNumberAndChar(clusterName)
      this
    }

    /**
      *  create a single-node cluster.
      *  NOTED: this is a async method since starting a cluster is always gradual.
      * @param nodeName node name
      * @return cluster description
      */
    def nodeName(nodeName: String): ClusterCreator.this.type = nodeNames(Seq(nodeName))

    /**
      *  create a cluster.
      *  NOTED: this is a async method since starting a cluster is always gradual.
      * @param nodeNames nodes' name
      * @return cluster description
      */
    def nodeNames(nodeNames: Seq[String]): ClusterCreator.this.type = {
      this.nodeNames = nodeNames
      this
    }

    def create(): Future[T]
  }
}
