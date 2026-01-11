Feature: Storyboard and Graph Interaction

  Scenario: Dragging a node to a storyboard scene
    Given I am on the Zen Editor dual page
    When I locate the node "Tamaki Mizuno" in the graph explorer
    And I drag the node "Tamaki Mizuno" to the "persons" slot of the first scene
    Then I should see a tag "Tamaki Mizuno" in the "persons" slot

  Scenario: Opening Zen Editor from a graph node
    Given I am on the Zen Editor dual page
    When I click on the node "Tamaki Mizuno" in the node list
    Then I should see the Zen Editor drawer open
    And the editor title should contain "Tamaki Mizuno"

