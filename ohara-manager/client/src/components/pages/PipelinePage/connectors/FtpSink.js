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
import styled from 'styled-components';
import toastr from 'toastr';
import PropTypes from 'prop-types';

import * as _ from 'utils/commonUtils';
import * as MESSAGES from 'constants/messages';
import * as pipelinesApis from 'apis/pipelinesApis';
import { CONNECTOR_TYPES } from 'constants/pipelines';
import { SchemaTable } from 'common/Table';
import { ConfirmModal, Modal } from 'common/Modal';
import { primaryBtn } from 'theme/btnTheme';
import { lightBlue } from 'theme/variables';
import { Input, Select, FormGroup, Label, Button } from 'common/Form';
import { Tab, Tabs, TabList, TabPanel } from 'common/Tabs';
import { updateTopic } from 'utils/pipelineUtils';

const FormGroupWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const FormGroupCheckbox = styled(FormGroup)`
  flex-direction: row;
  align-items: center;
  color: ${lightBlue};
`;

const Checkbox = styled(Input)`
  height: auto;
  width: auto;
  margin-right: 8px;
`;

const NewRowBtn = styled(Button)`
  margin-left: auto;
`;

const FormInner = styled.div`
  padding: 20px;
`;

class FtpSink extends React.Component {
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
    tasks: 'currTask',
    fileEncodings: 'currFileEncoding',
    readTopics: 'currReadTopic',
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
    host: '',
    port: '',
    username: '',
    password: '',
    outputfolder: '',
    readTopics: [],
    schema: [],
    currReadTopic: {},
    fileEncodings: ['UTF-8'],
    currFileEncoding: {},
    tasks: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    currTask: {},
    needHeader: true,
    isNewRowModalActive: false,
    isDeleteRowModalActive: false,
    columnName: '',
    newColumnName: '',
    IsTestConnectionBtnWorking: false,
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
    const sinkId = _.get(this.props.match, 'params.connectorId', null);
    this.setDefaults();
    this.fetchSink(sinkId);
  };

  fetchSink = async sinkId => {
    const res = await pipelinesApis.fetchSink(sinkId);
    const result = _.get(res, 'data.result', false);

    if (result) {
      const {
        schema = '[]',
        name = '',
        configs,
        topics: prevTopics,
      } = res.data.result;
      const {
        'ftp.hostname': host = '',
        'ftp.port': port = '',
        'ftp.user.name': username = '',
        'ftp.user.password': password = '',
        'ftp.output.folder': outputfolder = '',
        'ftp.encode': currFileEncoding = '',
        'ftp.needHeader': needHeader = false,
        currTask,
      } = configs;

      if (_.isEmpty(prevTopics)) {
        this.setTopic();
      } else {
        const { topics } = this.props;
        const currReadTopic = topics.find(topic => topic.id === prevTopics[0]);

        updateTopic(this.props, currReadTopic, 'sink');
        this.setState({ ReadTopics: topics, currReadTopic });
      }

      const _needHeader = needHeader === 'true' ? true : false;

      this.setState({
        name,
        host,
        port,
        username,
        password,
        outputfolder,
        currFileEncoding,
        currTask,
        needHeader: _needHeader,
        schema,
      });
    }
  };

  setTopic = () => {
    const { topics } = this.props;

    this.setState(
      {
        readTopics: topics,
        currReadTopic: topics[0],
      },
      () => {
        const { currReadTopic } = this.state;
        updateTopic(this.props, currReadTopic, 'sink');
      },
    );
  };

  handleInputChange = ({ target: { name, value } }) => {
    this.setState({ [name]: value }, () => {
      this.props.updateHasChanges(true);
    });
  };

  handleCheckboxChange = ({ target }) => {
    const { name, checked } = target;
    this.setState({ [name]: checked }, () => {
      this.props.updateHasChanges(true);
    });
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

  handleDeleteRowModalOpen = (e, order) => {
    e.preventDefault();
    this.setState({ isDeleteRowModalActive: true, workingRow: order });
  };

  handleDeleteRowModalClose = () => {
    this.setState({ isDeleteRowModalActive: false, workingRow: null });
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
    const res = await pipelinesApis.validateFtp({
      hostname,
      port,
      user,
      password,
    });
    this.updateIsTestConnectionBtnWorking(false);

    const _res = _.get(res, 'data.isSuccess', false);

    if (_res) {
      toastr.success(MESSAGES.TEST_SUCCESS);
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
    const { match, updateHasChanges, isPipelineRunning } = this.props;
    const {
      name,
      host,
      port,
      username,
      password,
      outputfolder,
      needHeader,
      currReadTopic,
      currFileEncoding,
      currTask,
      schema,
    } = this.state;

    if (isPipelineRunning) {
      toastr.error(MESSAGES.CANNOT_UPDATE_WHILE_RUNNING_ERROR);
      updateHasChanges(false);
      return;
    }

    const sinkId = _.get(match, 'params.connectorId', null);
    const _schema = _.isEmpty(schema) ? [] : schema;
    const topics = _.isEmpty(currReadTopic) ? [] : [currReadTopic.id];

    const params = {
      name,
      schema: _schema,
      className: CONNECTOR_TYPES.ftpSink,
      topics,
      numberOfTasks: 1,
      configs: {
        'ftp.output.folder': outputfolder,
        'ftp.encode': currFileEncoding,
        'ftp.hostname': host,
        'ftp.port': port,
        'ftp.user.name': username,
        'ftp.user.password': password,
        'ftp.needHeader': String(needHeader),
        currTask,
      },
    };

    await pipelinesApis.updateSink({ id: sinkId, params });
    updateHasChanges(false);
    updateTopic(this.props, currReadTopic, 'sink');
  }, 1000);

  render() {
    const {
      name,
      host,
      port,
      username,
      password,
      fileEncodings,
      currFileEncoding,
      tasks,
      schema,
      currTask,
      isNewRowModalActive,
      readTopics,
      currReadTopic,
      outputfolder,
      needHeader,
      columnName,
      newColumnName,
      currType,
      isDeleteRowModalActive,
      IsTestConnectionBtnWorking,
    } = this.state;

    return (
      <React.Fragment>
        <Tabs>
          <TabList>
            <Tab>FTP Sink 1/2</Tab>
            <Tab>FTP Sink 2/2</Tab>
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
                    width="100%"
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
                  placeholder="FTP sink name"
                  value={name}
                  data-testid="name-input"
                  handleChange={this.handleInputChange}
                />
              </FormGroup>

              <FormGroup>
                <Label>FTP host</Label>
                <Input
                  name="host"
                  width="100%"
                  placeholder="ftp://localhost"
                  value={host}
                  data-testid="host-input"
                  handleChange={this.handleInputChange}
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
                />
              </FormGroup>
              <FormGroup>
                <Button
                  theme={primaryBtn}
                  text="Test connection"
                  isWorking={IsTestConnectionBtnWorking}
                  disabled={IsTestConnectionBtnWorking}
                  data-testid="test-connection-btn"
                  handleClick={this.handleTestConnection}
                />
              </FormGroup>
            </form>
          </TabPanel>

          <TabPanel>
            <form>
              <FormGroupWrapper>
                <FormGroup width="70%" margin="0 20px 20px 0">
                  <Label>File encoding</Label>
                  <Select
                    name="fileEnconding"
                    data-testid="file-enconding-select"
                    selected={currFileEncoding}
                    list={fileEncodings}
                    handleChange={this.handleSelectChange}
                  />
                </FormGroup>

                <FormGroup width="30%">
                  <Label>Task</Label>
                  <Select
                    name="tasks"
                    data-testid="task-select"
                    selected={currTask}
                    list={tasks}
                    handleChange={this.handleSelectChange}
                  />
                </FormGroup>
              </FormGroupWrapper>

              <FormGroup>
                <Label>Read topic</Label>
                <Select
                  isObject
                  name="readTopics"
                  width="100%"
                  data-testid="read-topic-select"
                  selected={currReadTopic}
                  list={readTopics}
                  handleChange={this.handleSelectChange}
                />
              </FormGroup>

              <FormGroup>
                <Label>Output Folder</Label>
                <Input
                  name="outputfolder"
                  width="100%"
                  placeholder="/home/user1"
                  value={outputfolder}
                  data-testid="outputfolder-input"
                  handleChange={this.handleInputChange}
                />
              </FormGroup>

              <FormGroupCheckbox>
                <Checkbox
                  type="checkbox"
                  name="needHeader"
                  width="25px"
                  value=""
                  checked={needHeader}
                  data-testid="needheader-input"
                  handleChange={this.handleCheckboxChange}
                />
                Include header
              </FormGroupCheckbox>
            </form>
          </TabPanel>
          <TabPanel>
            <NewRowBtn
              text="New row"
              theme={primaryBtn}
              data-testid="new-row-btn"
              handleClick={this.handleNewRowModalOpen}
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
      </React.Fragment>
    );
  }
}

export default FtpSink;
