Feature: Storyboard File Persistence
  As a story producer
  I want my storyboard to be saved to a local JSON-LD file
  So that it can be managed by Git and shared with others

  Scenario: Saving a storyboard and verifying it persists
    Given I am on the Zen Editor dual page
    And I wait for the "Syncing world..." message to disappear
    When I add a manual scene to the storyboard
    And I enter "Confrontation in the server room" in the description of the new scene
    And I click the "Save to DB" button
    Then I should see a success message "Saved successfully to file"
    When I reload the page
    Then I should see the scene with description "Confrontation in the server room"

