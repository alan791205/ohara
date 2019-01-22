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
import { includes } from 'lodash';

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
import { SchemaTable } from 'common/Table';
import { ConfirmModal, Modal } from 'common/Modal';
import { primaryBtn } from 'theme/btnTheme';
import * as CSS_VARS from 'theme/variables';
import { Input, Select, FormGroup, Label, Button } from 'common/Form';
import { Tab, Tabs, TabList, TabPanel } from 'common/Tabs';
import { updateTopic, findByGraphId } from 'utils/pipelineUtils';

const BoxWrapper = styled(Box).attrs({
  padding: '25px 0',
})``;

const TitleWrapper = styled(FormGroup).attrs({
  isInline: true,
})`
  position: relative;
  margin: 0 25px 30px 25px;
`;

const H5Wrapper = styled(H5)`
  margin: 0;
  font-weight: normal;
  color: ${CSS_VARS.lightBlue};
`;
H5Wrapper.displayName = 'H5';

const Controller = styled.div`
  position: absolute;
  right: 0;
`;

const ControlButton = styled.button`
  color: ${CSS_VARS.lightBlue};
  border: 0;
  font-size: 20px;
  cursor: pointer;
  background-color: transparent;

  &:hover {
    color: blue;
  }
`;

const FormGroupWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const NewRowBtn = styled(Button)`
  margin-left: auto;
`;
NewRowBtn.displayName = 'NewRowBtn';

const FormInner = styled.div`
  padding: 20px;
`;

class FtpSource extends React.Component {
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
    graph: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        id: PropTypes.string,
        isActive: PropTypes.bool,
        isExact: PropTypes.bool,
        icon: PropTypes.string,
      }),
    ).isRequired,
    topics: PropTypes.array.isRequired,
  };

  selectMaps = {
    tasks: 'currTask',
    writeTopics: 'currWriteTopic',
    fileEncodings: 'currFileEncoding',
    types: 'currType',
  };

  schemaHeader = [
    '#',
    'Column name',
    'New column name',
    'Type',
    'Up',
    'Down',
    'Delete',
  ];

  schemaTypes = ['string', 'integer', 'boolean'];

  state = {
    name: '',
    state: '',
    host: '',
    port: '',
    username: '',
    password: '',
    inputFolder: '',
    completeFolder: '',
    errorFolder: '',
    writeTopics: [],
    currWriteTopic: {},
    fileEncodings: ['UTF-8'],
    currFileEncoding: {},
    tasks: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    currTask: {},
    schema: [],
    isDeleteRowModalActive: false,
    isNewRowModalActive: false,
    workingRow: null,
    columnName: '',
    newColumnName: '',
    currType: '',
    pipelines: {},
  };

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
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

  setDefaults = () => {
    this.setState(({ fileEncodings, tasks }) => ({
      currFileEncoding: fileEncodings[0],
      currTask: tasks[0],
    }));
  };

  fetchData = () => {
    const sourceId = _.get(this.props.match, 'params.connectorId', null);
    this.setDefaults();
    this.fetchSource(sourceId);
  };

  fetchSource = async sourceId => {
    const res = await pipelinesApis.fetchSource(sourceId);
    const result = _.get(res, 'data.result', null);

    if (result) {
      const {
        schema = '[]',
        name = '',
        state,
        configs,
        topics: prevTopics,
      } = result;
      const {
        'ftp.user.name': username = '',
        'ftp.user.password': password = '',
        'ftp.port': port = '',
        'ftp.hostname': host = '',
        'ftp.input.folder': inputFolder = '',
        'ftp.completed.folder': completeFolder = '',
        'ftp.error.folder': errorFolder = '',
        'ftp.encode': currFileEncoding = '',
        currTask = '',
      } = configs;

      if (_.isEmpty(prevTopics)) {
        this.setTopic();
      } else {
        const { topics } = this.props;
        const currWriteTopic = topics.find(topic => topic.id === prevTopics[0]);

        updateTopic(this.props, currWriteTopic, 'source');
        this.setState({ writeTopics: topics, currWriteTopic });
      }

      this.setState({
        name,
        state,
        host,
        port,
        username,
        password,
        inputFolder,
        completeFolder,
        errorFolder,
        currFileEncoding,
        currTask,
        schema,
      });
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
      const targets = ['columnName', 'newColumnName'];

      if (!targets.includes(name)) {
        this.props.updateHasChanges(true);
      }
    });
  };

  handleDeleteRowModalOpen = (e, order) => {
    e.preventDefault();
    this.setState({ isDeleteRowModalActive: true, workingRow: order });
  };

  handleDeleteRowModalClose = () => {
    this.setState({ isDeleteRowModalActive: false, workingRow: null });
  };

  handleTypeChange = (e, order) => {
    // https://reactjs.org/docs/events.html#event-pooling
    e.persist();
    this.setState(({ schema }) => {
      const idx = schema.findIndex(schema => schema.order === order);
      const { value: dataType } = e.target;

      const update = {
        ...schema[idx],
        dataType,
      };

      const _schema = [
        ...schema.slice(0, idx),
        update,
        ...schema.slice(idx + 1),
      ];

      return {
        schema: _schema,
      };
    });

    this.props.updateHasChanges(true);
  };

  handleRowDelete = () => {
    if (_.isNull(this.state.workingRow)) return;

    this.setState(({ schema, workingRow }) => {
      const update = schema
        .filter(schema => schema.order !== workingRow)
        .map((schema, idx) => ({ ...schema, order: ++idx }));

      return {
        schema: update,
        isDeleteRowModalActive: false,
      };
    });

    this.props.updateHasChanges(true);
  };

  handleNewRowModalOpen = () => {
    this.setState({
      isNewRowModalActive: true,
      currType: this.schemaTypes[0],
    });
  };

  handleNewRowModalClose = () => {
    this.setState({
      isNewRowModalActive: false,
      currType: '',
      columnName: '',
      newColumnName: '',
    });
  };

  handleUp = (e, order) => {
    e.preventDefault();

    if (order === 1) return;

    this.setState(({ schema }) => {
      const idx = schema.findIndex(s => s.order === order);

      const _schema = [
        ...schema.slice(0, idx - 1),
        schema[idx],
        schema[idx - 1],
        ...schema.slice(idx + 1),
      ].map((schema, idx) => ({ ...schema, order: ++idx }));

      return {
        schema: _schema,
      };
    });

    this.props.updateHasChanges(true);
  };

  handleDown = (e, order) => {
    e.preventDefault();

    if (order === this.state.schema.length) return;

    this.setState(({ schema }) => {
      const idx = schema.findIndex(s => s.order === order);

      const _schema = [
        ...schema.slice(0, idx),
        schema[idx + 1],
        schema[idx],
        ...schema.slice(idx + 2),
      ].map((schema, idx) => ({ ...schema, order: ++idx }));

      return {
        schema: _schema,
      };
    });

    this.props.updateHasChanges(true);
  };

  handleRowCreate = () => {
    this.setState(
      ({
        schema,
        columnName: name,
        newColumnName: newName,
        currType: type,
      }) => {
        const _order = _.isEmpty(schema)
          ? 1
          : schema[schema.length - 1].order + 1;

        const newSchema = {
          name,
          newName,
          dataType: type,
          order: _order,
        };

        return {
          isNewRowModalActive: false,
          schema: [...schema, newSchema],
          columnName: '',
          newColumnName: '',
          currType: this.schemaTypes[0],
        };
      },
    );

    this.props.updateHasChanges(true);
  };

  handleTestConnection = async e => {
    e.preventDefault();
    const { host: hostname, port, username: user, password } = this.state;

    this.updateIsTestConnectionBtnWorking(true);
    const res = await pipelinesApis.checkSource({
      hostname,
      port,
      user,
      password,
    });
    this.updateIsTestConnectionBtnWorking(false);
    const isSuccess = _.get(res, 'data.isSuccess', false);

    if (isSuccess) {
      toastr.success(MESSAGES.TEST_SUCCESS);
      this.setState({ isFormDisabled: false });
    }
  };

  updateIsTestConnectionBtnWorking = update => {
    this.setState({ IsTestConnectionBtnWorking: update });
  };

  handleSelectChange = ({ target }) => {
    const { name, options, value } = target;
    const selectedIdx = options.selectedIndex;
    const { id } = options[selectedIdx].dataset;
    const hasId = Boolean(id);
    const current = this.selectMaps[name];

    if (hasId) {
      this.setState(
        () => {
          return {
            [current]: {
              name: value,
              id,
            },
          };
        },
        () => {
          this.props.updateHasChanges(true);
        },
      );

      return;
    }

    this.setState(
      () => {
        return {
          [current]: value,
        };
      },
      () => {
        if (current !== 'currType') {
          this.props.updateHasChanges(true);
        }
      },
    );
  };

  save = _.debounce(async () => {
    const {
      match,
      graph,
      updateGraph,
      updateHasChanges,
      isPipelineRunning,
    } = this.props;
    const {
      name,
      host,
      port,
      username,
      password,
      inputFolder,
      completeFolder,
      errorFolder,
      currWriteTopic,
      currFileEncoding,
      currTask,
      schema,
    } = this.state;

    if (isPipelineRunning) {
      toastr.error(MESSAGES.CANNOT_UPDATE_WHILE_RUNNING_ERROR);
      updateHasChanges(false);
      return;
    }

    const sourceId = _.get(match, 'params.connectorId', null);
    const _schema = _.isEmpty(schema) ? [] : schema;
    const topics = _.isEmpty(currWriteTopic) ? [] : [currWriteTopic.id];

    const params = {
      name,
      schema: _schema,
      className: CONNECTOR_TYPES.ftpSource,
      topics,
      numberOfTasks: 1,
      configs: {
        'ftp.input.folder': inputFolder,
        'ftp.completed.folder': completeFolder,
        'ftp.error.folder': errorFolder,
        'ftp.encode': currFileEncoding,
        'ftp.hostname': host,
        'ftp.port': port,
        'ftp.user.name': username,
        'ftp.user.password': password,
        currTask,
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
    const { match } = this.props;
    const sourceId = _.get(match, 'params.connectorId', null);
    let res;
    if (action === CONNECTOR_ACTIONS.start) {
      res = await pipelinesApis.startSource(sourceId);
    } else {
      res = await pipelinesApis.stopSource(sourceId);
    }

    this.handleTriggerConnectorResponse(action, res);
  };

  handleTriggerConnectorResponse = (action, res) => {
    const isSuccess = _.get(res, 'data.isSuccess', false);
    if (!isSuccess) return;

    const { match, graph, updateGraph } = this.props;
    const sourceId = _.get(match, 'params.connectorId', null);
    const state = _.get(res, 'data.result.state');
    this.setState({ state });
    const currSource = findByGraphId(graph, sourceId);
    const update = { ...currSource, state };
    updateGraph(update, currSource.id);

    if (action === CONNECTOR_ACTIONS.start) {
      if (state === CONNECTOR_STATES.running) {
        toastr.success(MESSAGES.START_CONNECTOR_SUCCESS);
      } else {
        toastr.error(MESSAGES.CANNOT_START_CONNECTOR_ERROR);
      }
    }
  };

  render() {
    const {
      name,
      state,
      host,
      port,
      username,
      password,
      inputFolder,
      completeFolder,
      errorFolder,
      writeTopics,
      currWriteTopic,
      fileEncodings,
      currFileEncoding,
      tasks,
      IsTestConnectionBtnWorking,
      currTask,
      schema,
      isDeleteRowModalActive,
      isNewRowModalActive,
      columnName,
      newColumnName,
      currType,
    } = this.state;

    const isRunning = includes(
      [CONNECTOR_STATES.running, CONNECTOR_STATES.failed],
      state,
    );

    return (
      <React.Fragment>
        <BoxWrapper>
          <TitleWrapper>
            <H5Wrapper>FTP connection</H5Wrapper>
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
          <Tabs>
            <TabList>
              <Tab>FTP Source 1/2</Tab>
              <Tab>FTP Source 2/2</Tab>
              <Tab>Output schema</Tab>
            </TabList>
            <ConfirmModal
              isActive={isDeleteRowModalActive}
              title="Delete row?"
              confirmBtnText="Yes, Delete this row"
              cancelBtnText="No, Keep it"
              handleCancel={this.handleDeleteRowModalClose}
              handleConfirm={this.handleRowDelete}
              message="Are you sure you want to delete this row? This action cannot be redo!"
              isDelete
            />

            <Modal
              isActive={isNewRowModalActive}
              title="New row"
              width="290px"
              confirmBtnText="Create"
              handleConfirm={this.handleRowCreate}
              handleCancel={this.handleNewRowModalClose}
            >
              <form>
                <FormInner>
                  <FormGroup>
                    <Label>Column name</Label>
                    <Input
                      name="columnName"
                      width="250px"
                      placeholder="Column name"
                      value={columnName}
                      data-testid="column-name-modal"
                      handleChange={this.handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>New column name</Label>
                    <Input
                      name="newColumnName"
                      width="100%"
                      placeholder="New column name"
                      value={newColumnName}
                      data-testid="new-column-name-modal"
                      handleChange={this.handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Type</Label>
                    <Select
                      name="types"
                      width="100%"
                      list={this.schemaTypes}
                      selected={currType}
                      handleChange={this.handleSelectChange}
                    />
                  </FormGroup>
                </FormInner>
              </form>
            </Modal>
            <TabPanel>
              <form>
                <FormGroup>
                  <Label>Name</Label>
                  <Input
                    name="name"
                    width="100%"
                    placeholder="FTP source name"
                    value={name}
                    data-testid="name-input"
                    handleChange={this.handleInputChange}
                    disabled={isRunning}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>FTP host</Label>
                  <Input
                    name="host"
                    width="100%"
                    placeholder="http://localhost"
                    value={host}
                    data-testid="host-input"
                    handleChange={this.handleInputChange}
                    disabled={isRunning}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>FTP port</Label>
                  <Input
                    name="port"
                    width="100%"
                    placeholder="21"
                    value={port}
                    data-testid="port-input"
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

                <FormGroup>
                  <Button
                    theme={primaryBtn}
                    text="Test Connection"
                    isWorking={IsTestConnectionBtnWorking}
                    disabled={IsTestConnectionBtnWorking || isRunning}
                    data-testid="test-connection-btn"
                    handleClick={this.handleTestConnection}
                  />
                </FormGroup>
              </form>
            </TabPanel>

            <TabPanel>
              <form>
                <FormGroupWrapper>
                  <FormGroup css={{ width: '70%', margin: '0 20px 0 0' }}>
                    <Label>File encoding</Label>
                    <Select
                      name="fileEnconding"
                      list={fileEncodings}
                      selected={currFileEncoding}
                      data-testid="file-enconding-select"
                      handleChange={this.handleSelectChange}
                      disabled={isRunning}
                    />
                  </FormGroup>

                  <FormGroup width="30%">
                    <Label>Task</Label>
                    <Select
                      name="tasks"
                      list={tasks}
                      selected={currTask}
                      data-testid="task-select"
                      handleChange={this.handleSelectChange}
                      disabled={isRunning}
                    />
                  </FormGroup>
                </FormGroupWrapper>
                <FormGroup>
                  <Label>Write topic</Label>
                  <Select
                    isObject
                    name="writeTopics"
                    list={writeTopics}
                    selected={currWriteTopic}
                    width="100%"
                    data-testid="write-topic-select"
                    handleChange={this.handleSelectChange}
                    disabled={isRunning}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Input folder</Label>
                  <Input
                    name="inputFolder"
                    width="100%"
                    placeholder="/path/to/the/input/folder"
                    value={inputFolder}
                    data-testid="input-folder-input"
                    handleChange={this.handleInputChange}
                    disabled={isRunning}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Complete folder</Label>
                  <Input
                    name="completeFolder"
                    width="100%"
                    placeholder="/path/to/the/complete/folder"
                    value={completeFolder}
                    data-testid="complete-folder-input"
                    handleChange={this.handleInputChange}
                    disabled={isRunning}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Error folder</Label>
                  <Input
                    name="errorFolder"
                    width="100%"
                    placeholder="/path/to/the/error/folder"
                    value={errorFolder}
                    data-testid="error-folder-input"
                    handleChange={this.handleInputChange}
                    disabled={isRunning}
                  />
                </FormGroup>
              </form>
            </TabPanel>
            <TabPanel>
              <NewRowBtn
                text="New row"
                theme={primaryBtn}
                data-testid="new-row-btn"
                handleClick={this.handleNewRowModalOpen}
                disabled={isRunning}
              />
              <SchemaTable
                headers={this.schemaHeader}
                schema={schema}
                dataTypes={this.schemaTypes}
                handleTypeChange={this.handleTypeChange}
                handleModalOpen={this.handleDeleteRowModalOpen}
                handleUp={this.handleUp}
                handleDown={this.handleDown}
              />
            </TabPanel>
          </Tabs>
        </BoxWrapper>
      </React.Fragment>
    );
  }
}

export default FtpSource;
