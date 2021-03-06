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

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import toastr from 'toastr';
import { Redirect } from 'react-router-dom';

import * as URLS from 'constants/urls';
import * as _ from 'utils/commonUtils';
import * as MESSAGES from 'constants/messages';
import * as pipelinesApis from 'apis/pipelinesApis';
import {
  CONNECTOR_TYPES,
  CONNECTOR_STATES,
  CONNECTOR_ACTIONS,
} from 'constants/pipelines';
import { Box } from 'common/Layout';
import { H5 } from 'common/Headings';
import { DataTable } from 'common/Table';
import { lightBlue } from 'theme/variables';
import { primaryBtn } from 'theme/btnTheme';
import { Input, Select, FormGroup, Label, Button } from 'common/Form';
import { fetchCluster } from 'apis/clusterApis';
import { updateTopic, findByGraphId } from 'utils/pipelineUtils';

const TitleWrapper = styled(FormGroup).attrs({
  isInline: true,
})`
  position: relative;
  margin: 0 0 30px;
`;

const H5Wrapper = styled(H5)`
  margin: 0;
  font-weight: normal;
  color: ${lightBlue};
`;

const Controller = styled.div`
  position: absolute;
  right: 0;
`;

const ControlButton = styled.button`
  color: ${lightBlue};
  border: 0;
  font-size: 20px;
  cursor: pointer;
  background-color: transparent;

  &:hover {
    color: blue;
  }
`;

const Fieldset = styled.fieldset`
  border: none;
  position: relative;
  padding: 0;

  &:after {
    content: '';
    background-color: red;
    width: 100%;
    height: 100%;
    display: ${props => (props.disabled ? 'block' : 'none')};
    position: absolute;
    top: 0;
    left: 0;
    background: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
  }
`;

const TableWrapper = styled.div`
  display: flex;
  width: 100%;
`;

const GetTablesBtn = styled(Button)`
  align-self: flex-start;
  margin-left: 20px;
  white-space: nowrap;
`;

class JdbcSource extends React.Component {
  static propTypes = {
    hasChanges: PropTypes.bool.isRequired,
    updateHasChanges: PropTypes.func.isRequired,
    updateGraph: PropTypes.func.isRequired,
    loadGraph: PropTypes.func.isRequired,
    match: PropTypes.shape({
      isExact: PropTypes.bool,
      params: PropTypes.object,
      path: PropTypes.string,
      url: PropTypes.string,
    }).isRequired,
    topics: PropTypes.array.isRequired,
  };

  selectMaps = {
    databases: 'currDatabase',
    tables: 'currTable',
    writeTopics: 'currWriteTopic',
  };

  dbSchemasHeader = ['Column name', 'Column type'];

  state = {
    name: '',
    state: '',
    databases: [],
    currDatabase: {},
    tables: [],
    currTable: {},
    writeTopics: [],
    currWriteTopic: {},
    username: '',
    password: '',
    url: '',
    timestamp: '',
    isBtnWorking: false,
    isFormDisabled: false,
    isRedirect: false,
  };

  componentDidMount() {
    this.fetchData();
  }

  async componentDidUpdate(prevProps) {
    const { topics: prevTopics } = prevProps;
    const { connectorId: prevConnectorId } = prevProps.match.params;
    const { hasChanges, topics: currTopics } = this.props;
    const { connectorId: currConnectorId } = this.props.match.params;

    if (prevTopics !== currTopics) {
      this.setState({ writeTopics: currTopics });
    }

    if (prevConnectorId !== currConnectorId) {
      this.fetchData();
    }

    if (hasChanges) {
      this.save();
    }
  }

  fetchData = () => {
    const sourceId = _.get(this.props.match, 'params.connectorId', null);
    this.fetchCluster();
    this.fetchSource(sourceId);
  };

  fetchSource = async sourceId => {
    const res = await pipelinesApis.fetchSource(sourceId);
    const result = _.get(res, 'data.result', null);

    if (result) {
      const { name, state, configs, topics: prevTopics } = result;
      const {
        'source.timestamp.column.name': timestamp = '',
        'source.db.username': username = '',
        'source.db.password': password = '',
        'source.db.url': url = '',
        table = '{}',
        database = '{}',
      } = configs;

      if (_.isEmpty(prevTopics)) {
        this.setTopic();
      } else {
        const { topics } = this.props;
        const currWriteTopic = topics.find(topic => topic.id === prevTopics[0]);

        updateTopic(this.props, currWriteTopic, 'source');
        this.setState({ writeTopics: topics, currWriteTopic });
      }

      let currTable = null;
      let tables = [];
      if (!_.isEmptyStr(table)) {
        currTable = JSON.parse(table);
        tables = [currTable];
      }

      const _db = JSON.parse(database);
      const currDatabase = this.state.databases.find(
        db => db.name === _db.name,
      );

      const hasValidProps = [username, password, url].map(x => {
        return x.length > 0;
      });

      const isFormDisabled = !hasValidProps.every(x => x === true);

      this.setState({
        name,
        state,
        isFormDisabled,
        currDatabase,
        tables,
        currTable,
        timestamp,
        password,
        username,
        url,
      });
    }
  };

  fetchRdbTables = async () => {
    const { url, username, password, currTable } = this.state;
    const res = await pipelinesApis.queryRdb({ url, user: username, password });
    const tables = _.get(res, 'data.result.tables', null);
    const _currTable = _.isEmpty(currTable) ? tables[0] : currTable;

    if (tables) {
      this.setState({ tables, currTable: _currTable });
    }
  };

  fetchCluster = async () => {
    const res = await fetchCluster();
    const databases = _.get(res, 'data.result.supportedDatabases', null);

    if (databases) {
      this.setState({ databases, currDatabase: databases[0] });
    }
  };

  setTopic = () => {
    const { topics } = this.props;

    this.setState(
      {
        writeTopics: topics,
        currWriteTopic: topics[0],
      },
      () => {
        const { currWriteTopic } = this.state;
        updateTopic(this.props, currWriteTopic, 'source');
      },
    );
  };

  handleInputChange = ({ target: { name, value } }) => {
    this.setState({ [name]: value }, () => {
      this.props.updateHasChanges(true);
    });
  };

  handleChangeSelect = ({ target }) => {
    const { name, options, value } = target;
    const selectedIdx = options.selectedIndex;
    const { id } = options[selectedIdx].dataset;
    const current = this.selectMaps[name];
    const isTable = name.toLowerCase() === 'tables';
    const schema = isTable
      ? this.state.tables.find(table => table.name === value).schema
      : undefined;

    this.setState(
      () => {
        return {
          [current]: {
            name: value,
            id,
            schema,
          },
        };
      },
      () => {
        this.props.updateHasChanges(true);
      },
    );
  };

  handleGetTables = async e => {
    e.preventDefault();
    const { username: user, password, url } = this.state;

    this.updateIsBtnWorking(true);
    const res = await pipelinesApis.validateRdb({ user, password, url });
    this.updateIsBtnWorking(false);
    const isSuccess = _.get(res, 'data.isSuccess', false);

    if (isSuccess) {
      toastr.success(MESSAGES.TEST_SUCCESS);
      this.setState({ isFormDisabled: false });
      this.fetchRdbTables();
    }
  };

  updateIsBtnWorking = update => {
    this.setState({ isBtnWorking: update });
  };

  save = _.debounce(async () => {
    const {
      match,
      updateHasChanges,
      isPipelineRunning,
      graph,
      updateGraph,
    } = this.props;
    const {
      name,
      currDatabase,
      currWriteTopic,
      currTable,
      timestamp,
      username,
      password,
      url,
    } = this.state;

    if (isPipelineRunning) {
      toastr.error(MESSAGES.CANNOT_UPDATE_WHILE_RUNNING_ERROR);
      updateHasChanges(false);
      return;
    }

    const sourceId = _.get(match, 'params.connectorId', null);
    const topics = _.isEmpty(currWriteTopic) ? [] : [currWriteTopic.id];

    const params = {
      name,
      schema: [],
      className: CONNECTOR_TYPES.jdbcSource,
      topics,
      numberOfTasks: 1,
      configs: {
        'source.table.name': currTable.name,
        'source.db.url': url,
        'source.db.username': username,
        'source.db.password': password,
        'source.timestamp.column.name': timestamp,
        'source.schema.pattern': '',
        database: JSON.stringify(currDatabase),
        table: JSON.stringify(currTable),
      },
    };

    await pipelinesApis.updateSource({ id: sourceId, params });
    updateHasChanges(false);

    const currSource = findByGraphId(graph, sourceId);
    const to = _.isEmpty(topics) ? '?' : topics[0];
    const update = { ...currSource, to };
    updateGraph(update, currSource.id);
  }, 1000);

  handleStartBtnClick = async () => {
    await this.triggerConnector(CONNECTOR_ACTIONS.start);
  };

  handleStopBtnClick = async () => {
    await this.triggerConnector(CONNECTOR_ACTIONS.stop);
  };

  triggerConnector = async action => {
    const { match, graph, updateGraph } = this.props;
    const sourceId = _.get(match, 'params.connectorId', null);
    let res;
    if (action === CONNECTOR_ACTIONS.start) {
      res = await pipelinesApis.startSource(sourceId);
    } else {
      res = await pipelinesApis.stopSource(sourceId);
    }
    const isSuccess = _.get(res, 'data.isSuccess', false);
    if (isSuccess) {
      const state = _.get(res, 'data.result.state');
      this.setState({ state });
      const currSource = findByGraphId(graph, sourceId);
      const update = { ...currSource, state };
      updateGraph(update, currSource.id);
    }
  };

  render() {
    const {
      name,
      state,
      url,
      username,
      password,
      databases,
      currDatabase,
      isBtnWorking,
      tables,
      currTable,
      timestamp,
      writeTopics,
      currWriteTopic,
      isRedirect,
    } = this.state;

    if (isRedirect) {
      return <Redirect to={URLS.PIPELINE} />;
    }

    const isRunning = state === CONNECTOR_STATES.running;

    return (
      <React.Fragment>
        <Box>
          <TitleWrapper>
            <H5Wrapper>JDBC connection</H5Wrapper>
            <Controller>
              <ControlButton
                onClick={this.handleStartBtnClick}
                data-testid="start-button"
              >
                <i className={`fa fa-play-circle`} />
              </ControlButton>
              <ControlButton
                onClick={this.handleStopBtnClick}
                data-testid="stop-button"
              >
                <i className={`fa fa-stop-circle`} />
              </ControlButton>
            </Controller>
          </TitleWrapper>
          <Fieldset disabled={isBtnWorking}>
            <FormGroup data-testid="name">
              <Label>Name</Label>
              <Input
                name="name"
                width="100%"
                placeholder="JDBC source name"
                value={name}
                data-testid="name-input"
                handleChange={this.handleInputChange}
                disabled={isRunning}
              />
            </FormGroup>

            <FormGroup>
              <Label>Database</Label>
              <Select
                name="databases"
                list={databases}
                selected={currDatabase}
                width="100%"
                data-testid="dataset-select"
                handleChange={this.handleChangeSelect}
                disabled={isRunning}
              />
            </FormGroup>

            <FormGroup>
              <Label>URL</Label>
              <Input
                name="url"
                width="100%"
                placeholder="jdbc:mysql://localhost:3030/my-db"
                value={url}
                data-testid="url-input"
                handleChange={this.handleInputChange}
                disabled={isRunning}
              />
            </FormGroup>

            <FormGroup>
              <Label>User name</Label>
              <Input
                name="username"
                width="100%"
                placeholder="John Doe"
                value={username}
                data-testid="username-input"
                handleChange={this.handleInputChange}
                disabled={isRunning}
              />
            </FormGroup>

            <FormGroup>
              <Label>Password</Label>
              <Input
                type="password"
                name="password"
                width="100%"
                placeholder="password"
                value={password}
                data-testid="password-input"
                handleChange={this.handleInputChange}
                disabled={isRunning}
              />
            </FormGroup>
          </Fieldset>
          <Fieldset disabled={isBtnWorking}>
            <FormGroup>
              <Label>Table</Label>

              <TableWrapper>
                <Select
                  isObject
                  name="tables"
                  list={tables}
                  selected={currTable}
                  width="100%"
                  data-testid="table-select"
                  handleChange={this.handleChangeSelect}
                  disabled={isRunning}
                />

                <GetTablesBtn
                  theme={primaryBtn}
                  text="Get tables"
                  isWorking={isBtnWorking}
                  disabled={isBtnWorking || isRunning}
                  data-testid="get-tables-btn"
                  handleClick={this.handleGetTables}
                />
              </TableWrapper>
            </FormGroup>

            <FormGroup>
              <Label>Timestamp column</Label>
              <Input
                name="timestamp"
                width="100%"
                placeholder="cf3"
                value={timestamp}
                data-testid="timestamp-input"
                handleChange={this.handleInputChange}
                disabled={isRunning}
              />
            </FormGroup>

            <FormGroup>
              <Label>Write topic</Label>
              <Select
                isObject
                name="writeTopics"
                list={writeTopics}
                selected={currWriteTopic}
                width="100%"
                data-testid="write-topic-select"
                handleChange={this.handleChangeSelect}
                disabled={isRunning}
              />
            </FormGroup>
          </Fieldset>
        </Box>

        {!_.isEmpty(currTable) && (
          <Box>
            <H5Wrapper>Database schemas</H5Wrapper>
            <DataTable headers={this.dbSchemasHeader}>
              {currTable.schema.map(({ name, dataType }, idx) => {
                return (
                  <tr key={idx}>
                    <td>{name}</td>
                    <td>{dataType}</td>
                  </tr>
                );
              })}
            </DataTable>
          </Box>
        )}
      </React.Fragment>
    );
  }
}

export default JdbcSource;
