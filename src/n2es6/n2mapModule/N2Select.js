/**
 * @module n2es6/n2mapModule/N2Select
 */

import Interaction from './Interaction.js';
const N2SelectEventType = {
	/**
	 * Triggered when features has been (de)selected.
	 * @event N2SelectEvent#n2select
	 * @api
	 */
	HOVER : 'hover',
	CLICKED : 'clicked',
	FOCUS : 'focus',
	FIND : 'find'
}
class N2SelectEvent  extends Event {
	constructor(type, selected, deselected ,mapBrowserEvent) {
		super(type);

		this.selected  = selected;
		this.deselected = deselected;
		this.mapBrowserEvent = mapBrowserEvent;
	}
}
/**
 * @classdesc
 * @extends Interaction
 * @fires N2SelectEvent
 * @api
 */
class N2Select extends Interaction {
	constructor(opt_options){
		const options = opt_options ? opt_options: {};
		super({
			handleEvent: handleEvent
		});
	}





}
