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
import cx from 'classnames';

import { defaultBtn } from 'theme/btnTheme';
import {
  radiusNormal,
  durationNormal,
  lighterGray,
  lightGray,
  white,
  blue,
} from 'theme/variables';

const BtnWrapper = styled.button`
  font-size: 13px;
  font-family: inherit;
  border: ${props => props.theme.border};
  border-radius: ${radiusNormal};
  color: ${props => props.theme.color};
  padding: 12px 16px;
  background-color: ${props => props.theme.bgColor};
  width: ${({ width }) => width};
  transition: ${durationNormal} all;

  &:hover {
    border: ${props => props.theme.borderHover};
    background-color: ${props => props.theme.bgHover};
    color: ${props => props.theme.colorHover};
    transition: ${durationNormal} all;
  }

  &:focus {
    border-color: ${blue};
    box-shadow: 0 0 0 3px rgba(76, 132, 255, 0.25);
    transition: ${durationNormal} all;
  }

  &.is-working,
  &.is-disabled {
    border: 1px solid ${lighterGray};
    cursor: not-allowed;
    color: ${lightGray};
    background-color: ${white};
  }
`;

BtnWrapper.displayName = 'Button';

const IconWrapper = styled.i`
  margin-left: 5px;
`;

IconWrapper.displayName = 'Icon';

const Button = ({
  text,
  handleClick = () => {},
  theme = defaultBtn,
  type = 'submit',
  width = 'auto',
  disabled = false,
  isWorking = false,
  className = '',
  ...rest
}) => {
  const cls = cx({ 'is-working': isWorking }, { 'is-disabled': disabled });

  return (
    <BtnWrapper
      type={type}
      width={width}
      onClick={handleClick}
      theme={theme}
      className={`${className} ${cls}`}
      disabled={disabled}
      {...rest}
    >
      {text} {isWorking && <IconWrapper className="fas fa-spinner fa-spin" />}
    </BtnWrapper>
  );
};

Button.propTypes = {
  text: PropTypes.string.isRequired,
  handleClick: PropTypes.func,
  theme: PropTypes.shape({
    color: PropTypes.string,
    bgColor: PropTypes.string,
    border: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bgHover: PropTypes.string,
    colorHover: PropTypes.string,
    borderHover: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  type: PropTypes.string,
  width: PropTypes.string,
  disabled: PropTypes.bool,
  isWorking: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;
