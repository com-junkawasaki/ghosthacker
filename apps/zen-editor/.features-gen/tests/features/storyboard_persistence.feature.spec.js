// Generated from: tests/features/storyboard_persistence.feature
import { test } from "../../../tests/steps/fixtures.ts";

test.describe('Storyboard File Persistence', () => {

  test('Saving a storyboard and verifying it persists', async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the Zen Editor dual page', null, { page }); 
    await And('I wait for the "Syncing world..." message to disappear', null, { page }); 
    await When('I add a manual scene to the storyboard', null, { page }); 
    await And('I enter "Confrontation in the server room" in the description of the new scene', null, { page }); 
    await And('I click the "Save to DB" button', null, { page }); 
    await Then('I should see a success message "Saved successfully to file"', null, { page }); 
    await When('I reload the page', null, { page }); 
    await Then('I should see the scene with description "Confrontation in the server room"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/features/storyboard_persistence.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":6,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the Zen Editor dual page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And I wait for the \"Syncing world...\" message to disappear","stepMatchArguments":[{"group":{"start":15,"value":"\"Syncing world...\"","children":[{"start":16,"value":"Syncing world...","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When I add a manual scene to the storyboard","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And I enter \"Confrontation in the server room\" in the description of the new scene","stepMatchArguments":[{"group":{"start":8,"value":"\"Confrontation in the server room\"","children":[{"start":9,"value":"Confrontation in the server room","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I click the \"Save to DB\" button","stepMatchArguments":[{"group":{"start":12,"value":"\"Save to DB\"","children":[{"start":13,"value":"Save to DB","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then I should see a success message \"Saved successfully to file\"","stepMatchArguments":[{"group":{"start":31,"value":"\"Saved successfully to file\"","children":[{"start":32,"value":"Saved successfully to file","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"When I reload the page","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then I should see the scene with description \"Confrontation in the server room\"","stepMatchArguments":[{"group":{"start":40,"value":"\"Confrontation in the server room\"","children":[{"start":41,"value":"Confrontation in the server room","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end