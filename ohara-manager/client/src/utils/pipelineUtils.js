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

import * as _ from './commonUtils';

export const isSource = kind => kind.includes('Source');

export const isSink = kind => kind.includes('Sink');

export const isTopic = kind => kind === 'topic';

export const isStream = kind => kind === 'streamApp';

export const findByGraphId = (graph, id) => {
  const result = graph.find(x => x.id === id);
  return result;
};

export const updateTopic = (props, currTopic, connectorType) => {
  if (!currTopic || _.isEmpty(currTopic)) return;

  const { graph, match, updateGraph } = props;
  const connectorId = _.get(match, 'params.connectorId');

  let updateId = '';
  let update = null;

  if (connectorType === 'source') {
    const currConnector = findByGraphId(graph, connectorId);
    const to = _.isEmpty(currTopic) ? '?' : currTopic.id;
    update = { ...currConnector, to };
    updateId = currConnector.id;
  } else {
    const currTopicId = _.isEmpty(currTopic) ? '?' : currTopic.id;
    const topic = findByGraphId(graph, currTopicId);
    update = { ...topic, to: connectorId };
    updateId = currTopicId;
  }

  updateGraph(update, updateId);
};
