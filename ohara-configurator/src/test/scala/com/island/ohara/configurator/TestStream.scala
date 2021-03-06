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

package com.island.ohara.configurator
import java.io.File

import com.island.ohara.client.configurator.v0.StreamApi
import com.island.ohara.client.configurator.v0.StreamApi.{StreamListRequest, StreamPropertyRequest}
import com.island.ohara.common.rule.SmallTest
import org.junit.{After, Before, Test}
import org.scalatest.Matchers

import scala.concurrent.Await
import scala.concurrent.duration._

class TestStream extends SmallTest with Matchers {

  private[this] val configurator = Configurator.fake()
  private[this] val accessStreamList = StreamApi.accessOfList().hostname(configurator.hostname).port(configurator.port)
  private[this] val accessStreamProperty =
    StreamApi.accessOfProperty().hostname(configurator.hostname).port(configurator.port)

  private[this] val pipeline_id = "pipeline-id"

  @Before
  def tearUp(): Unit = {}

  @Test
  def testStreamAppListPage(): Unit = {
    val filePaths = for (i <- 1 to 3) yield {
      val file = File.createTempFile("empty_", ".jar")
      file.getPath
    }
    // Test POST method
    val res1 = Await.result(
      accessStreamList.upload(pipeline_id, filePaths),
      30 seconds
    )
    res1.foreach(jar => {
      jar.jarName.startsWith("empty_") shouldBe true
    })

    // Test GET method
    val res2 = Await.result(
      accessStreamList.list(pipeline_id),
      10 seconds
    )
    res2.size shouldBe 3

    // Test DELETE method
    val deleteJar = res1.head
    val d = Await.result(
      accessStreamList.delete(deleteJar.id),
      10 seconds
    )
    d.jarName shouldBe deleteJar.jarName

    //Test PUT method
    val originJar = res1.last
    val anotherJar = StreamListRequest("la-new.jar")
    val updated = Await.result(
      accessStreamList.update(originJar.id, anotherJar),
      10 seconds
    )
    updated.jarName shouldBe "la-new.jar"
  }

  @Test
  def testStreamAppPropertyPage(): Unit = {
    val filePaths = for (i <- 1 to 3) yield {
      val file = File.createTempFile("empty_", ".jar")
      file.getPath
    }

    val jarData = Await.result(
      accessStreamList.upload(pipeline_id, filePaths),
      30 seconds
    )

    // Test GET method
    val id = jarData.head.id
    val res1 = Await.result(accessStreamProperty.get(id), 10 seconds)
    res1.id shouldBe id
    res1.fromTopics.size shouldBe 0
    res1.toTopics.size shouldBe 0
    res1.instances shouldBe 1

    // Test PUT method
    val req = StreamPropertyRequest("my-app", Seq("from-topic"), Seq("to-topic"), 2)
    val res2 = Await.result(accessStreamProperty.update(id, req), 10 seconds)
    res2.name shouldBe "my-app"
    res2.fromTopics.size shouldBe 1
    res2.toTopics.size shouldBe 1
    res2.instances shouldBe 2
  }

  @After
  def tearDown(): Unit = {}
}
