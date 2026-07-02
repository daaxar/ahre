Feature: Create {{entity}}
  Scenario: Create a valid {{entity}}
    Given a valid request
    When the request is sent
    Then the {{entity}} is created
