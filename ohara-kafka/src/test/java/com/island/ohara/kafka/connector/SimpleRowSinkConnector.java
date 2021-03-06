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

package com.island.ohara.kafka.connector;

import static com.island.ohara.kafka.connector.Constants.BROKER;
import static com.island.ohara.kafka.connector.Constants.OUTPUT;

import java.util.Collections;
import java.util.List;

/** Used for testing. */
public class SimpleRowSinkConnector extends RowSinkConnector {
  @Override
  protected void _start(TaskConfig props) {
    this.config = props;
    // check the option
    this.config.options().get(OUTPUT);
    this.config.options().get(BROKER);
  }

  @Override
  protected void _stop() {}

  @Override
  protected Class<? extends RowSinkTask> _taskClass() {

    return SimpleRowSinkTask.class;
  }

  @Override
  protected List<TaskConfig> _taskConfigs(int maxTasks) {
    return Collections.nCopies(maxTasks, config);
  }

  private TaskConfig config = null;
}
