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

import * as _ from 'utils/commonUtils';
import * as CSS_VARS from 'theme/variables';
import * as MESSAGES from 'constants/messages';
import * as configurationApis from 'apis/configurationApis';
import { fetchCluster } from 'apis/clusterApis';
import { Input, Select, FormGroup, Label, Button } from 'common/Form';
import { cancelBtn, primaryBtn, defaultBtn } from 'theme/btnTheme';

const modalStyles = {
  content: {
    top: '15%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, 0)',
    padding: 0,
  },
};

const ModalBody = styled.div`
  display: flex;
`;

const Connections = styled.div`
  padding: 0;
  width: 200px;
  overflow-y: auto;
  background-color: ${CSS_VARS.whiteSmoke};
`;

const DatabaseForm = styled.div`
  padding: 20px;
`;

const Actions = styled.div`
  display: flex;
  padding: 15px;
  border-top: 1px solid ${CSS_VARS.lighterGray};
  justify-content: flex-end;
`;

const TestBtn = styled(Button)`
  margin-top: 20px;
  color: ${CSS_VARS.lighterBlue};
  width: 140px;

  /* Prevent button from wrapping if the btn is working and therefore an extra loading icon is displayed */
  white-space: nowrap;
`;

const AddIcon = styled.button`
  color: ${CSS_VARS.lightBlue};
  cursor: pointer;
  border: 0;
  font-size: 20px;
  background: transparent;

  &:hover {
    color: ${CSS_VARS.blue};
  }
`;

const DeleteIcon = styled.button`
  color: ${CSS_VARS.lightBlue};
  cursor: pointer;
  border: 0;
  font-size: 20px;
  background: transparent;

  &:hover {
    color: ${CSS_VARS.blue};
  }
`;

const CancelBtn = styled(Button)`
  margin-right: 10px;
`;

const ApplyBtn = styled(Button)`
  margin-right: 10px;
  color: ${CSS_VARS.lighterBlue};
`;

const ComfirmBtn = styled(Button)`
  margin-right: 10px;
`;

const Li = styled.li`
  background-color: ${({ isSelected }) =>
    isSelected ? CSS_VARS.white : CSS_VARS.whiteSmoke};
  color: ${CSS_VARS.lightBlue};
  cursor: pointer;
  border: 0;
  font-size: 13px;
  padding: 15px 20px;
  border-bottom: 1px solid ${CSS_VARS.lighterGray};

  &:hover {
    color: ${CSS_VARS.blue};
  }
`;

const Block = styled.div`
  border-bottom: 1px solid ${CSS_VARS.lighterGray};
  padding: 10px;
`;

class DbConfiguration extends React.Component {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
  };
  state = {
    databases: [],
    currDatabase: {},
    user: '',
    password: '',
    connections: [],
    connectionName: '',
    connectionUrl: '',
    connectionId: '',
    isBtnDisabled: true,
    isFormDirty: false,
    isValidConnection: false,
    isTestBtnWorking: false,
  };

  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
    this.fetchCluster();
    this.fetchJdbc();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchCluster = async () => {
    const res = await fetchCluster();
    const databases = _.get(res, 'data.result.supportedDatabases', null);

    if (databases && this._isMounted) {
      this.setState({ databases, currDatabase: databases[0] });
    }
  };

  fetchJdbc = async () => {
    const res = await configurationApis.fetchJdbc();
    const result = _.get(res, 'data.result', []);

    result.forEach(conn => {
      conn.isSelected = false;
    });

    if (!_.isEmptyArr(result) && this._isMounted) {
      this.setState({ connections: result });
    }
  };

  handleAddConnection = e => {
    e.preventDefault();
    const { connections } = this.state;
    this.setState({
      connections: [
        ...connections,
        {
          name: 'Untitled Connection',
          id: '',
          url: '',
          user: '',
          password: '',
          isSelected: false,
        },
      ],
    });
  };

  handleDeleteConnection = async (e, id, name) => {
    e.preventDefault();
    if (!name) {
      toastr.error(MESSAGES.CONFIG_DELETE_CHECK);
      return;
    }
    if (!id) {
      this.setState({
        connections: [],
      });
    } else {
      const res = await configurationApis.deleteJdbc(id);
      const isSuccess = _.get(res, 'data.isSuccess', false);
      if (isSuccess) {
        toastr.success(MESSAGES.CONFIG_DELETE_SUCCESS + name);
      }
    }
    this.fetchJdbc();
    this.resetModal();
  };

  handleChange = ({ target: { value, name } }) => {
    this.setState(
      { [name]: value, isFormDirty: true, isBtnDisabled: true },
      () => {
        const { connectionName, connectionUrl, user, password } = this.state;
        if (
          !this.hasEmptyInput([connectionName, connectionUrl, user, password])
        ) {
          this.setState({ isBtnDisabled: false });
        }
      },
    );
  };

  handleSave = async e => {
    e.preventDefault();
    const {
      connectionId: id,
      connectionName: name,
      connectionUrl: url,
      user,
      password,
    } = this.state;

    if (!name) {
      toastr.error(MESSAGES.EMPTY_NAME_ERROR);
      return;
    }
    if (!url) {
      toastr.error(MESSAGES.EMPTY_CONN_URL_ERROR);
      return;
    }
    if (!user) {
      toastr.error(MESSAGES.EMPTY_USER_ERROR);
      return;
    }
    if (!password) {
      toastr.error(MESSAGES.EMPTY_PASSWORD_ERROR);
      return;
    }
    const isValid = this.state.isValidConnection;
    if (isValid) {
      let res = null;
      if (!id) {
        res = await configurationApis.saveJdbc({
          name,
          url,
          user,
          password,
        });
      } else {
        res = await configurationApis.updateJdbc({
          id,
          name,
          url,
          user,
          password,
        });
      }
      const isSuccess = _.get(res, 'data.isSuccess', false);
      if (isSuccess) {
        toastr.success(MESSAGES.CONFIG_SAVE_SUCCESS);
        this.fetchJdbc();
        this.setState({ isModalActive: false, isFormDirty: false });
        this.resetModal();
        this.handleModalClose();
      } else {
        toastr.error(MESSAGES.GENERIC_ERROR);
      }
    } else {
      toastr.error(MESSAGES.TEST_NOT_SUCCESS);
    }
  };

  handleTestConnection = async e => {
    e.preventDefault();
    const { connectionUrl: url, user, password } = this.state;
    this.updateBtn(true);
    const res = await configurationApis.validateRdb({ url, user, password });
    this.updateBtn(false);

    const isSuccess = _.get(res, 'data.isSuccess', false);

    if (isSuccess) {
      toastr.success(MESSAGES.TEST_SUCCESS);
      this.setState({ isFormDirty: false, isValidConnection: true });
    }
  };

  handleApplyConnection = async e => {
    e.preventDefault();
    const {
      connectionName: name,
      connectionUrl: url,
      user,
      password,
      connectionId: id,
    } = this.state;

    if (!name) {
      toastr.error(MESSAGES.EMPTY_NAME_ERROR);
      return;
    }
    if (!url) {
      toastr.error(MESSAGES.EMPTY_CONN_URL_ERROR);
      return;
    }
    if (!user) {
      toastr.error(MESSAGES.EMPTY_USER_ERROR);
      return;
    }
    if (!password) {
      toastr.error(MESSAGES.EMPTY_PASSWORD_ERROR);
      return;
    }
    const isValid = this.state.isValidConnection;
    if (isValid) {
      let res = null;
      if (!id) {
        res = await configurationApis.saveJdbc({
          name,
          url,
          user,
          password,
        });
      } else {
        res = await configurationApis.updateJdbc({
          id,
          name,
          url,
          user,
          password,
        });
      }
      const isSuccess = _.get(res, 'data.isSuccess', false);
      if (isSuccess) {
        toastr.success(MESSAGES.CONFIG_SAVE_SUCCESS);
        this.fetchJdbc();
        this.setState({ isModalActive: false, isFormDirty: false });
        this.resetModal();
      } else {
        toastr.error(MESSAGES.GENERIC_ERROR);
      }
    } else {
      toastr.error(MESSAGES.TEST_NOT_SUCCESS);
    }
  };

  hasEmptyInput = inputs => {
    return inputs.some(input => _.isEmptyStr(input));
  };

  updateBtn = update => {
    this.setState({ isTestBtnWorking: update, isBtnDisabled: update });
  };

  resetModal = () => {
    this.setState({
      user: '',
      password: '',
      connectionName: '',
      connectionUrl: '',
      connectionId: '',
    });
  };

  setModalField = (e, id) => {
    const result = this.state.connections.filter(conn => {
      return conn.id === id;
    });

    const { connections } = this.state;
    connections.forEach(conn => {
      if (conn.id === id) {
        conn.isSelected = true;
      } else {
        conn.isSelected = false;
      }
    });

    this.setState({
      connections: connections,
      connectionName: result[0].name,
      connectionUrl: result[0].url,
      connectionId: result[0].id,
      user: result[0].user,
      password: result[0].password,
    });
    result[0].isSelected = true;
  };

  handleModalClose = () => {
    this.props.handleClose();
    if (this._isMounted) {
      this.reset();
    }
  };

  reset = () => {
    this.setState({
      user: '',
      password: '',
      connections: [],
      connectionName: '',
      connectionUrl: '',
      connectionId: '',
    });
  };

  render() {
    const {
      databases,
      currDatabase,
      user,
      password,
      connections,
      connectionName,
      connectionUrl,
      connectionId,
      isTestBtnWorking,
    } = this.state;

    return (
      <div style={modalStyles}>
        <ModalBody>
          <Connections>
            <Block>
              <AddIcon onClick={this.handleAddConnection}>
                <i className="far fa-plus-square" />
              </AddIcon>
              <DeleteIcon
                onClick={e =>
                  this.handleDeleteConnection(e, connectionId, connectionName)
                }
              >
                <i className="far fa-minus-square" />
              </DeleteIcon>
            </Block>

            <ul>
              {connections.map(({ id, name, isSelected }, idx) => {
                return (
                  <Li
                    isSelected={isSelected}
                    key={idx}
                    onClick={e => this.setModalField(e, id)}
                  >
                    {name}
                  </Li>
                );
              })}
            </ul>
          </Connections>
          <DatabaseForm>
            <FormGroup>
              <Label>Name</Label>
              <Input
                id="connectionName"
                name="connectionName"
                value={connectionName}
                width="250px"
                placeholder="JDBC source name"
                data-testid="connection-name-input"
                handleChange={this.handleChange}
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
                handleChange={this.handleChange}
              />
            </FormGroup>
            <FormGroup>
              <Label>URL</Label>
              <Input
                id="connectionUrl"
                name="connectionUrl"
                width="250px"
                placeholder="jdbc:mysql://localhost:3306/dbname"
                value={connectionUrl}
                data-testid="connection-url-input"
                handleChange={this.handleChange}
              />
            </FormGroup>
            <FormGroup>
              <Label>User name</Label>
              <Input
                id="user"
                name="user"
                width="250px"
                placeholder="System admin"
                value={user}
                data-testid="user-input"
                handleChange={this.handleChange}
              />
            </FormGroup>
            <FormGroup>
              <Label>Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                width="250px"
                placeholder="password"
                value={password}
                data-testid="password-input"
                handleChange={this.handleChange}
              />
              <TestBtn
                text="Test Connection"
                theme={defaultBtn}
                isWorking={isTestBtnWorking}
                data-testid="test-connection-btn"
                handleClick={this.handleTestConnection}
              />
            </FormGroup>
          </DatabaseForm>
        </ModalBody>
        <div>
          <Actions>
            <CancelBtn
              text="Cancel"
              theme={cancelBtn}
              handleClick={this.handleModalClose}
              data-testid="modal-cancel-btn"
            />
            <ApplyBtn
              text="Apply"
              theme={defaultBtn}
              data-testid="modal-apply-btn"
              handleClick={this.handleApplyConnection}
            />
            <ComfirmBtn
              text="OK"
              theme={primaryBtn}
              handleClick={this.handleSave}
              data-testid="modal-submit-btn"
            />
          </Actions>
        </div>
      </div>
    );
  }
}

export default DbConfiguration;
