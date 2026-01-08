Feature: Story Node Interaction

  Scenario: Chatting with a character node
    Given I am on the Story Topology page
    When I click on a character node named "Tamaki"
    And I click on "Chat with Node"
    Then I should see the chat overlay
    When I type "Hello Tamaki" and press Enter
    Then I should see my message in the chat history
    And I should eventually see a response from "Tamaki"

