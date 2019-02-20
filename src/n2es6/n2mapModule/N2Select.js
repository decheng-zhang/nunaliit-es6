/**
 * @module n2es6/n2mapModule/N2Select
 */

import Interaction from 'ol/interaction/Interaction.js';
import {singleClick, never, shiftKeyOnly, pointerMove} from 'ol/events/condition.js';
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
class N2SelectEvent extends Event {
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
			handleEvent: handleMove_
		});
		this.hitTolerance_ = options.hitTolerance ? options.hitTolerance : 4;

		/**
	     * @private
	     * @type {boolean}
	     */
	    this.multi_ = options.multi ? options.multi : false;

		//clicked can return multiple ones.
		this.clickedFeatures_ = [];

		//hover can only hover one
		this.hoveredFeature_ = null;
	}
	getHoveredFeatures() {
		return this.hoveredFeatures_;
	}

	getClickedFeatures(){
		return this.clickedFeatures_;
	}
	getHitTolerance() {
      return this.hitTolerance_;
    }

	setHitTolerance(hitTolerance) {
      this.hitTolerance_ = hitTolerance;
    }

}

  /**
   * [handleMove_ description]
   * @param  {import("../MapBrowserEvent.js").default} e [description]
   * @return {[type]}   [description]
   * @this {N2Select}
   */
   function	handleMove_(e) {

			const map = e.map;
			//** handle hover event **///
			//TODO make a list of n2.interaction, instead all take care by this interaction.
			if (e.type == "pointermove") {
				let selected = null ;
				var self = this;
				var b = map.forEachFeatureAtPixel(e.pixel,
					(function(f){
						selected = f;
						return !this.multi_;
					}).bind(this),
					{
						hitTolerance: this.hitTolerance_
					});
				if(this.hoveredFeature_ == selected) {
					/* no hovered changed */
				} else {
					this.hoveredFeature == selected;
					if (selected) {
						this.dispatchEvent(
							new N2SelectEvent(N2SelectEventType.HOVER,
								selected, e)
							);
					}
				}



			} else if (e.type == 'click') {

				let selected = [];
				map.forEachFeatureAtPixel(mapBrowserEvent.pixel,
			      (
			        /**
			         * @param {import("../Feature.js").FeatureLike} feature Feature.
			         * @param {import("../layer/Layer.js").default} layer Layer.
			         * @return {boolean|undefined} Continue to iterate over the features.
			         */
			        function(feature, layer) {
			          if (this.filter_(feature, layer)) {
			            selected.push(feature);
			            this.addFeatureLayerAssociation_(feature, layer);
			            return !this.multi_;
			          }
			        }).bind(this), {
			        layerFilter: this.layerFilter_,
			        hitTolerance: this.hitTolerance_
			      });
			    for (let i = features.getLength() - 1; i >= 0; --i) {
			      const feature = features.item(i);
			      const index = selected.indexOf(feature);
			      if (index > -1) {
			        // feature is already selected
			        selected.splice(index, 1);
			      } else {
			        features.remove(feature);
			        deselected.push(feature);
			      }
			    }
			    if (selected.length !== 0) {
			      features.extend(selected);
			    }
				if (selected.length > 0 || deselected.length > 0) {
			      this.dispatchEvent(
			        new SelectEvent(SelectEventType.SELECT,
			          selected, deselected, mapBrowserEvent));
			    }
			}

			return true;
	}

	export default N2Select;
