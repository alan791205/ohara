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

import * as URLS from '../../src/constants/urls';

describe('Header', () => {
  beforeEach(() => {
    cy.visit(URLS.HOME);
  });

  it('visits all pages from main navigation', () => {
    cy.get('nav').within(() => {
      cy.getByText('Pipelines').click();
      cy.location('pathname').should('eq', URLS.PIPELINE);

      cy.getByText('Nodes').click();
      cy.location('pathname').should('eq', URLS.NODES);

      cy.getByText('Services').click();
      cy.location('pathname').should('eq', URLS.SERVICES);

      cy.getByText('Monitoring').click();
      cy.location('pathname').should('eq', URLS.MONITORING);
    });
  });

  it('visits Log in page', () => {
    cy.getByText('Log in').click();
    cy.location('pathname').should('eq', URLS.LOGIN);
  });

  it('toggles configuration modal', () => {
    cy.getByTestId('config-btn').click();
    cy.get('.ReactModal__Content')
      .contains('Configuration')
      .should('be.visible');

    cy.getByTestId('close-btn').click();

    cy.get('.ReactModal__Content').should('not.be.visible');
  });
});
