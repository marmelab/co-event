module.exports = function (dispatcher) {

    this.events = [];

    function addEvent(event, data) {
        this.events.push({
            name: event,
            data: data
        });
    }

    function emitBuffered() {
        this.events.forEach(function (event) {
            dispatcher.emit(event.name, event.data);
        });
    }

    return {
        addEvent: addEvent,
        emitBuffered: emitBuffered
    };
};
