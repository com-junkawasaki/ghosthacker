// Generated from: tests/features/interaction.feature
import { test } from "../../../tests/steps/fixtures.ts";

test.describe('Storyboard and Graph Interaction', () => {

  test('Dragging a node to a storyboard scene', async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the Zen Editor dual page', null, { page }); 
    await When('I locate the node "Tamaki Mizuno" in the graph explorer', null, { page }); 
    await And('I drag the node "Tamaki Mizuno" to the "persons" slot of the first scene', null, { page }); 
    await Then('I should see a tag "Tamaki Mizuno" in the "persons" slot', null, { page }); 
  });

  test('Opening Zen Editor from a graph node', async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the Zen Editor dual page', null, { page }); 
    await When('I click on the node "Tamaki Mizuno" in the node list', null, { page }); 
    await Then('I should see the Zen Editor drawer open', null, { page }); 
    await And('the editor title should contain "Tamaki Mizuno"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/features/interaction.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I am on the Zen Editor dual page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I locate the node \"Tamaki Mizuno\" in the graph explorer","stepMatchArguments":[{"group":{"start":18,"value":"\"Tamaki Mizuno\"","children":[{"start":19,"value":"Tamaki Mizuno","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"And I drag the node \"Tamaki Mizuno\" to the \"persons\" slot of the first scene","stepMatchArguments":[{"group":{"start":16,"value":"\"Tamaki Mizuno\"","children":[{"start":17,"value":"Tamaki Mizuno","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":39,"value":"\"persons\"","children":[{"start":40,"value":"persons","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I should see a tag \"Tamaki Mizuno\" in the \"persons\" slot","stepMatchArguments":[{"group":{"start":19,"value":"\"Tamaki Mizuno\"","children":[{"start":20,"value":"Tamaki Mizuno","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":42,"value":"\"persons\"","children":[{"start":43,"value":"persons","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":13,"pickleLine":9,"tags":[],"steps":[{"pwStepLine":14,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"Given I am on the Zen Editor dual page","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"When I click on the node \"Tamaki Mizuno\" in the node list","stepMatchArguments":[{"group":{"start":20,"value":"\"Tamaki Mizuno\"","children":[{"start":21,"value":"Tamaki Mizuno","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then I should see the Zen Editor drawer open","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"And the editor title should contain \"Tamaki Mizuno\"","stepMatchArguments":[{"group":{"start":32,"value":"\"Tamaki Mizuno\"","children":[{"start":33,"value":"Tamaki Mizuno","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end