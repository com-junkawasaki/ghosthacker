// Generated from: tests/features/interaction.feature
import { test } from "../../../tests/steps/fixtures.ts";

test.describe('Story Node Interaction', () => {

  test('Chatting with a character node', async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the Story Topology page', null, { page }); 
    await When('I click on a character node named "Tamaki Mizuno"', null, { page }); 
    await And('I click on "Chat with Node"', null, { page }); 
    await Then('I should see the chat overlay', null, { page }); 
    await When('I type "Hello Tamaki" and press Enter', null, { page }); 
    await Then('I should see my message in the chat history', null, { page }); 
    await And('I should eventually see a response from "Tamaki"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/features/interaction.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I am on the Story Topology page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I click on a character node named \"Tamaki Mizuno\"","stepMatchArguments":[{"group":{"start":34,"value":"\"Tamaki Mizuno\"","children":[{"start":35,"value":"Tamaki Mizuno","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"And I click on \"Chat with Node\"","stepMatchArguments":[{"group":{"start":11,"value":"\"Chat with Node\"","children":[{"start":12,"value":"Chat with Node","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I should see the chat overlay","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":8,"keywordType":"Action","textWithKeyword":"When I type \"Hello Tamaki\" and press Enter","stepMatchArguments":[{"group":{"start":7,"value":"\"Hello Tamaki\"","children":[{"start":8,"value":"Hello Tamaki","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Then I should see my message in the chat history","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"And I should eventually see a response from \"Tamaki\"","stepMatchArguments":[{"group":{"start":40,"value":"\"Tamaki\"","children":[{"start":41,"value":"Tamaki","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end