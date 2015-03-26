define(['jquery'], function(jquery, a) {
    "use strict";
    describe('App', function () {

        console.log(a)

        var Person;
        beforeEach(module('App'));
        beforeEach(inject(function ( _Person_ ) {
            Person = _Person_;
        }));

        describe('Constructor', function () {

            it('assigns a name', function () {
                //expect(new Person('Ben')).to.have.property('name', 'Ben');
                //expect(true).toBe(true);
            });

        });
    });

});

