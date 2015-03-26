(function () {

    var ChallengePO = function () {

        this.elements = {
            signInBtn:   element(by.css('.b-btn_sign-in')),
            nextPageBtn: element(by.css('.b-btn_next-step')),
            progressBar: element.all(by.repeater('item in list'))
        };

        this.beforeEach = function () {
            browser.get('/#/');
            this.isDOMloaded();
            return this;
        };

        this.isDOMloaded = function () {
            return browser.wait(function () {
                return this.elements.signInBtn.isPresent();
            }.bind(this), 30000);
        };

        this.clickOnBtn = function ( el ) {
            return this.elements[el].click();
        };

        this.isCurrentProgressPosition = function ( pos ) {

            element.all(by.repeater('item in list'))

            //return this.elements.progressBar;
        }
    };

    module.exports = ChallengePO;

})();

