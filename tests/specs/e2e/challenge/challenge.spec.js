var ChallengePO = require('./challenge.po.js');

describe('E2E: Challenge page', function () {

    var challengePage;

    beforeEach(function () {
        challengePage = new ChallengePO();
        challengePage.beforeEach();
    });

    it('should redirect to the #/challenge page and content has been loaded', function () {
        expect(challengePage.isDOMloaded()).toBeTruthy();
        expect(Helpers.waitForUrlToChangeTo(/\/challenge/)).toBeTruthy();
    });

    it('should click on Next Step button and redirect to the #/works page', function () {
        challengePage.clickOnBtn('nextPageBtn');
        expect(Helpers.waitForUrlToChangeTo(/\/works/)).toBeTruthy();
    });

    it('should ', function () {
        expect(element.all(by.repeater('item in list')).get(0).getAttribute('class')).toMatch('b-progress-bar__circles__circle_enabled');
    });

});