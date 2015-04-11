define([
	"../core",
	"../event"
], function( jQuery ) {

// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
});

});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL3ZlbmRvcnMvanF1ZXJ5L3NyYy9ldmVudC9hamF4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImRlZmluZShbXG5cdFwiLi4vY29yZVwiLFxuXHRcIi4uL2V2ZW50XCJcbl0sIGZ1bmN0aW9uKCBqUXVlcnkgKSB7XG5cbi8vIEF0dGFjaCBhIGJ1bmNoIG9mIGZ1bmN0aW9ucyBmb3IgaGFuZGxpbmcgY29tbW9uIEFKQVggZXZlbnRzXG5qUXVlcnkuZWFjaCggWyBcImFqYXhTdGFydFwiLCBcImFqYXhTdG9wXCIsIFwiYWpheENvbXBsZXRlXCIsIFwiYWpheEVycm9yXCIsIFwiYWpheFN1Y2Nlc3NcIiwgXCJhamF4U2VuZFwiIF0sIGZ1bmN0aW9uKCBpLCB0eXBlICkge1xuXHRqUXVlcnkuZm5bIHR5cGUgXSA9IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRyZXR1cm4gdGhpcy5vbiggdHlwZSwgZm4gKTtcblx0fTtcbn0pO1xuXG59KTtcbiJdLCJmaWxlIjoic2NyaXB0cy92ZW5kb3JzL2pxdWVyeS9zcmMvZXZlbnQvYWpheC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9