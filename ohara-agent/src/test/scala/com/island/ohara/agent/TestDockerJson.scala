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

import com.island.ohara.client.configurator.v0.ContainerApi
import com.island.ohara.client.configurator.v0.ContainerApi.ContainerState
import com.island.ohara.client.configurator.v0.ContainerApi.ContainerState._
import com.island.ohara.common.rule.SmallTest
import org.junit.Test
import org.scalatest.Matchers

class TestDockerJson extends SmallTest with Matchers {

  @Test
  def testState(): Unit = {
    ContainerState.all shouldBe Seq(
      CREATED,
      RESTARTING,
      RUNNING,
      REMOVING,
      PAUSED,
      EXITED,
      DEAD
    )
  }

  @Test
  def testStateJson(): Unit = {
    ContainerState.all.foreach(
      state =>
        ContainerApi.CONTAINER_STATE_JSON_FORMAT
          .read(ContainerApi.CONTAINER_STATE_JSON_FORMAT.write(state)) shouldBe state)
  }

}
