(function () {

    var Helpers = {
        waitForUrlToChangeTo: function ( urlRegex ) {
            return browser.getCurrentUrl().then(function () {
                return browser.wait(function () {
                    return browser.getCurrentUrl().then(function ( url ) {
                        return urlRegex.test(url);
                    });
                });
            });
        },

        waitForElementDisplayed: function ( element ) {
            return browser.wait(function () {
                return element.isDisplayed();
            }, 30000);
        },

        clearIn: function (elem, length) {
            length = length || 30;
            var backspaceSeries = '';
            for (var i = 0; i < length; i++) {
                backspaceSeries += protractor.Key.BACK_SPACE;
            }
            elem.sendKeys(backspaceSeries);
        }
    };

    module.exports = Helpers;

})();

