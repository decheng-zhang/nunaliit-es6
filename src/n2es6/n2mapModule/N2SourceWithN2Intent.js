/**
* @module n2es6/n2mapModule/N2SourceWithN2Intent
*/

import VectorSource from 'ol/source/Vector.js';
import {listen} from 'ol/events.js';
import EventType from 'ol/events/EventType.js';


var _loc = function(str,args){ return $n2.loc(str,'nunaliit2',args); };
var DH = 'n2.canvasMap';
/**
 * @classdesc
 * @extends VectorSource
 */

class N2SourceWithN2Intent extends VectorSource {

	/**
	 * [constructor description]
	 * @param {Options} options [description]
	 */
	constructor(options) {

		super(options);

		
		this.dispatchService = options.dispatchService;
		/**
		 * [resolution description]
		 * @type {number|undefined}
		 */
		this.resolution = undefined;
		/**
		 * [source description]
		 * @type {[type]}
		 */
		this.source = options.source;
		/**
		 * [features_ array with N2 label in it]
		 * @type {Array}
		 */
		this.features_ = [];

		//-------------------------
		// HOVER and CLICK
		this.selectFeatureControl = null;
		this.hoverInfo = {
			feature: null
			,endFn: []
		};
		this.clickedInfo = {
			features: []
			,endFn: []
			,fids: {}
			,selectedId: null
		};
		this.focusInfo = {
			fids: {}
			,features: []
		};
		this.findFeatureInfo = {
			fid: null
			,features: []
		};

		this.interaction_ = options.interaction ;//new N2Intent({});
		if (!this.interaction_) {
			throw new Error("A valid interaction must be provided for "
			 +"this custom source");
		}
		//-------------------------
		listen(this.source, EventType.CHANGE, this.refresh, this);
		
		
		this.interaction_.on( "hover",  this.onHover.bind(this));
		this.interaction_.on( "clicked",  this.onClicked.bind(this));
		//this.interaction_.on( "focus",  this.onFocus.bind(this));
		//this.interaction_.on( "find",  this.onFind.bind(this));

		
		var _this = this;
		if( this.dispatchService ){
			
			var f = function(m, addr, dispatcher){
				_this._handleDispatch(m, addr, dispatcher);
			};

			this.dispatchService.register(DH,'focusOn',f);
			this.dispatchService.register(DH,'focusOff',f);
			this.dispatchService.register(DH,'focusOnSupplement',f);
			this.dispatchService.register(DH,'selected',f);
			this.dispatchService.register(DH,'selectedSupplement',f);
			this.dispatchService.register(DH,'unselected',f);
		};
	}

	onHover(evt){
		
		let selected  = evt.selected;
		
		
		//In case, there is single feature inside a N2Cluster features collection
	    if (selected){
	    	let innerFeatures = selected.cluster;
	    	if( innerFeatures && innerFeatures.length == 1){
	    		selected = innerFeatures[0];
	    	}
		}
	    if (this.hoverInfo.feature === selected) {
	    	//no really going to happen.
	    	return;
	    }
	    
	    this._endHover();
	    this.hoverInfo.feature = selected;
	    
		this._hoverFeature(selected);
		//TODO There should be a straightforward way to create popup
		//this._hoverFeaturePopup(selected, layer);
		
		//console.log("Rec: hovered feature: " + (evt.selected? evt.selected.ol_uid : null) +
		//	"dehovered: " + (evt.deselected ? evt.deselected.ol_uid: null));	
	    this.refresh();
		return true;
	}
	//clear up for hover
	_endHover() {
		for(var i=0,e=this.hoverInfo.endFn.length; i<e; ++i) {
			//try{
			this.hoverInfo.endFn[i](); 
			//} catch(e){};
		};
		this.hoverInfo.feature = null;
		this.hoverInfo.endFn = [];
	}
	
	_hoverFeature(feature) {
		if( !feature ) {
			return;
		};

		var dispatchService = this.dispatchService;
		
		var docIds = [];
		var docs = [];
		if( feature.cluster ){
			for(var ci=0,ce=feature.cluster.length; ci<ce; ++ci){
				var f = feature.cluster[ci];
				docIds.push( f.fid );
				docs.push( f.data );
			};
			
		} else {
			docIds.push( feature.fid );
			docs.push( feature.data );
		};

		this._registerEndHoverFn(function(){
			dispatchService.send(DH, {
				type: 'userFocusOff'
				,docIds: docIds
				,docs: docs
				,feature: feature
	 		});
		});

		if( docIds.length > 1 ){
			dispatchService.send(DH, {
				type: 'userFocusOn'
				,docIds: docIds
				,docs: docs
				,feature: feature
	 		});
		} else if( docIds.length > 0 ){
			dispatchService.send(DH, {
				type: 'userFocusOn'
				,docId: docIds[0]
				,doc: docs[0]
				,feature: feature
	 		});
		};
	}
	_registerEndHoverFn(fn) {
		this.hoverInfo.endFn.push(fn);
	} 
	
	_hoverFeaturePopup(feature, layer) {
		var _this = this;
		
		if( null == feature ) {
			return;
		};
		if( null == layer ) {
			return;
		};
	
		var layerInfo = layer._layerInfo;
		if( null == layerInfo ) {
			return;
		};
		
		var popupHtmlFn = layerInfo.featurePopupHtmlFn;
		if( null == popupHtmlFn ) {
			return;
		};

		// Figure out delay
		var delay = 0;
		if( typeof(layerInfo.featurePopupDelay) === 'number' ){
			delay = Math.floor(layerInfo.featurePopupDelay);
		};
		
		// Start or delay popup
		if( delay > 0 ) {
			window.setTimeout(function(){
				// Is it still relevant?
				if( isPopupCurrent() ) {
					initiatePopup();
				};
			},delay);
		} else {
			// immediate
			initiatePopup();
		};
		
		function isPopupCurrent(){
			// Asynchronous call. Check that the popup we want
			// to generate is still the one associated with the
			// feature being hovered.
			var hoveredFid = null;
			if( _this.hoverInfo.feature ) {
				hoveredFid = _this.hoverInfo.feature.fid;
			};
			if( hoveredFid !== feature.fid ) {
				// We have been called for a feature that is no longer
				// hovered
				return false;
			};
			
			return true; // still good
		};
		
		function computePopupPosition(){
	    	var popup_lonlat = null;
			var lastMapXy = _this.lastMapXy;
	    	if( null != lastMapXy ) {    	
	            var lonLat = _this.map.getLonLatFromPixel(lastMapXy);
	            if( lonLat ) { 
	            	popup_lonlat = lonLat;
	            };
	    	};
	    	if( !popup_lonlat ) {
	    		// Take centre of geometry
		    	popup_lonlat = feature.geometry.getBounds().getCenterLonLat();
	    	};
	    	return popup_lonlat;
		};
		
		function initiatePopup(){
			// Variables to manage wait pop-up
			var needWaitingPopup = true;
			
			// Call client function to generate HTML for popup
			popupHtmlFn({
				feature: feature
				,layerInfo: layerInfo
				,onSuccess: function(html){
					// We do not need to show a waiting pop-up
					// if it is not already up.
					needWaitingPopup = false;
					
					displayPopup(html);
				}
				,onError: function(){}//ignore
			});
			
			// If the popupHtmlFn() calls onSuccess before we
			// get here, then the variable needWaitingPopup is
			// false. In that situation, we do not need to create
			// a waiting pop-up (not waiting, the main pop-up is already
			// drawn). If the popupHtmlFn() is truly asynchronous (need
			// to fetch data over the network, for example), then
			// this code is reached before the onSuccess is called and
			// the variable needWaitingPopup is true.
			if( needWaitingPopup ) {
				displayPopup('<div class="olkit_wait"></div>');
			};
		};
	
		function displayPopup(popupHtml){
			if( !isPopupCurrent() ) {
				// Took too long. We are now displaying a popup for a
				// different feature.
				return;
			};
			
			// Destroy current pop-up if one is up
			destroyCurrentPopup();
			
			if( null === popupHtml || '' === popupHtml ) {
				// No error. Nothing to display.
				return;
			};

			// Figure out popup position
	    	var popup_lonlat = computePopupPosition();
	    	
	    	// Create pop-up
	    	var popup = new OpenLayers.Popup.Anchored(
	    		null // Let OpenLayers assign id
	    		,popup_lonlat
	    		,null
	    		,popupHtml
	    		,{
	    			size: new OpenLayers.Size(10,10)
	    			,offset: new OpenLayers.Pixel(-5,-5)
				}
				,false
				,onPopupClose
			);
	    	popup.autoSize = true;
	    	popup.panMapIfOutOfView = true;
			popup.setOpacity("80");

			// Set maximum pop-up size
			var mapSize = _this.map.getSize();
			if( mapSize ){
				popup.maxSize = new OpenLayers.Size(
					Math.floor(mapSize.w/3),
					Math.floor(mapSize.h/3)
				);
			};
			
			// Install new pop-up
			_this.currentPopup = popup;
			_this.map.addPopup(popup);

			// Add clean up routine
			if( _this.options && _this.options.keepPopUpsOpen ){
				// Leave opened (debugging)
			} else {
				_this._registerEndHoverFn(destroyCurrentPopup);
			};
			
			// Add routine to adjust popup position, once
			if( _this.options && _this.options.keepPopUpsStatic ){
				// Leave opened (debugging)
			} else {
				_this.addMapMousePositionListener(function(evt){
					if( _this.currentPopup === popup && _this.lastMapXy ) {
						_this.currentPopup.lonlat = _this.map.getLonLatFromPixel(_this.lastMapXy);
						_this.currentPopup.updatePosition();
						return true; // keep listener
					};
					
					return false; // remove listener
				});
			};
		};
		
		
		function destroyCurrentPopup() {
			var map = _this.map;
			var popup = _this.currentPopup;
			if( popup ) {
				map.removePopup(popup);
				popup.destroy();
				_this.currentPopup = null;
			};
		};
		
		function onPopupClose(evt) {
	    };
	}

	onClicked(evt){
		
		let selected = evt.selected;
		let deselected = evt.deselected;
		if ( selected && selected.length >= 0) {
			if ( selected.length === 1 ){
				selected = selected[0];
			} else if (selected.length === 0){
				selected = null;
			} else {
				throw new Error ("Nunaliit only support click one item a time");
			}
		}
		
		if ( deselected && deselected.length >= 0) {
			if ( deselected.length === 1 ){
				deselected = deselected[0];
			} else if (deselected.length === 0) {
				deselected = null;
			} else {
				throw new Error ("Nunaliit only support click one item a time");
			}
		}
		//In case, there is single feature inside a N2Cluster features collection
		if( selected ){
			let innerFeatures = selected.cluster;
			if( innerFeatures && innerFeatures.length == 1){
				selected = innerFeatures[0];
			}
		}
		
		if( deselected ){
			let innerFeatures = deselected.cluster;
			if( innerFeatures && innerFeatures.length == 1){
				deselected = innerFeatures[0];
			}
		}
		this._endClicked();
		if (deselected
				&& deselected.fid
				&& typeof deselected !== 'undefined' && deselected) {
			this._dispatch({type: 'userUnselect',
							docId: deselected.fid
							});
		}
		if ( selected 
				&& selected.fid 
				&&typeof selected !== 'undefined' ) {
			this.clickedInfo.features = [selected];

			this.clickedInfo.fids = {};
			this.clickedInfo.fids[selected.fid] = { clicked: true };
			this.clickedInfo.selectedId = selected.fid;
			
			selected.isClicked = true;
			
			selected.changed();
			if( this.interaction_.onStartClick ) {
				this.interaction_.onStartClick(selected);
			};
		}
		this.refresh();
		return true;
	}
	//clear up for click
	_endClicked() {
		if( this.clickedInfo.features ) {
			for(var i=0,e=this.clickedInfo.features.length;i<e;++i){
				var feature = this.clickedInfo.features[i];
				
				if( feature.isClicked ) {
					this.clickedInfo.fids = {};
					feature.isClicked = false;
					feature.n2SelectIntent = null;
					feature.changed();
				}
			}
		}
		
		this.clickedInfo.endFn = [];
		this.clickedInfo.features = [];
		this.clickedInfo.fids = {};
		this.clickedInfo.selectedId = null;
	}
		
	_startFocus(fids){
		this._endFocus();
		
		this.focusInfo.origin = {};
		for(var i=0,e=fids.length; i<e; ++i){
			var fid = fids[i];
			this.focusInfo.origin[fid] = true;
		};
		
		this._addFocus({
			fids: fids
		});
	}

	_addFocus(opts_){
		var opts = $n2.extend({
			fids: null
			,intent: null
		},opts_);

		if( opts.fids ){
			for(var i=0,e=opts.fids.length; i<e; ++i){
				var fid = opts.fids[i];
				this.focusInfo.fids[fid] = true;
			};
		};
		
		//var features = this._getMapFeaturesIncludingFidMap(this.focusInfo.fids);
		var features  = this._getMapFeaturesIncludeingFidMapOl5 (this.focusInfo.fids);
		if (features && features.length > 0) {
			for(var i=0,e=features.length; i<e; ++i){
				var f = features[i];
				if( f && !f.isHovered ) {
					f.isHovered = true;
					if( opts.intent ){
						f.n2HoverIntent = opts.intent;
					};
					//if( f.layer ) f.layer.drawFeature(f);
					if (f) f.changed();
					this.focusInfo.features.push( f );
				};
			};
		}
	}
	
	_endFocus() {
		for(var i=0,e=this.focusInfo.features.length;i<e;++i) {
			var feature = this.focusInfo.features[i];
			if( feature.isHovered ) {
				feature.isHovered = false;
				feature.n2HoverIntent = null;
				//if( feature.layer ) feature.layer.drawFeature(feature);
				if (feature) feature.changed();
			};
		};

		this.focusInfo.features = [];
		this.focusInfo.fids = {};
		this.focusInfo.origin = null;
	}
	
	onFocus(evt){
		
		return true;
	}
	onFind(evt){
		return true;
	}


	_getMapFeaturesIncludeingFidMapOl5(fidMap) {
		
		var result_features = [];
		if( this.features_ && this.features_.length > 0 ) {
			
			let features = this.features_;
			for(let loop=0;loop<features.length;++loop) {
				let feature = features[loop];
				if( feature.fid && fidMap[feature.fid] ) {
					result_features.push( feature );
				} else if( feature.cluster ) {
					for(var j=0,k=feature.cluster.length; j<k; ++j){
						var f = feature.cluster[j];
						if( f.fid && fidMap[f.fid] ){
							 result_features.push(f);
						};
					};
				};
			};
		};
		
		return result_features;
	}
	_selectedFeatures(features, fids){

		
		this._endClicked();
		
		this.clickedInfo.fids = {};
		if( fids ) {
			for(var i=0,e=fids.length; i<e; ++i){
				var fid = fids[i];
				
				this.clickedInfo.fids[fid] = { clicked: true };
				
				if( !this.clickedInfo.selectedId ){
					this.clickedInfo.selectedId = fid;
				};
			};
		};
		
		if( features ) {
			for(var i=0,e=features.length; i<e; ++i){
				var feature = features[i];

				this.clickedInfo.features.push(feature);

				feature.isClicked = true;
				if (feature){
					feature.changed();
				}
			};
		};
	}

	/**
	 * Add map selection to current selection.
	 */
	_selectedFeaturesSupplement(opts){
		if( opts.fid ) {
			this.clickedInfo.fids[opts.fid] = {
				clicked: true
			};
			if( opts.intent ){
				this.clickedInfo.fids[opts.fid].intent = opts.intent;
			};
		};
		
		if( opts.features ) {
			for(var i=0,e=opts.features.length; i<e; ++i){
				var f = opts.features[i];

				this.clickedInfo.features.push(f);

				f.isClicked = true;

				if( opts.intent ){
					f.n2SelectIntent = opts.intent;
				};
				if (f){
					f.changed();
				}
			};
		};
	}

	loadFeatures(extent, resolution, projection) {
		this.source.loadFeatures(extent, resolution, projection);
		if (resolution !== this.resolution) {

			this.clear();
			this.resolution = resolution;
			this.projection = projection;
			this.updateN2Label();
			this.addFeatures(this.features_);
		}
	}

	refresh() {
		this.clear();
		this.updateN2Label();
		this.addFeatures(this.features_);
		super.refresh();
		this.changed();
	}

	/**
	 * [addN2Label description]
	 */
	updateN2Label() {
		if (this.resolution === undefined) {
		  return;
		}
		this.features_.length = 0;
		let features = this.source.getFeatures();
		if( features ) {
				for(let i=0,e=features.length;i<e;++i){
					
					//Deal with n2_ tags to support style system
					var f = features[i];
					if( this.clickedInfo.fids[f.fid] ){
						var featureInfo = this.clickedInfo.fids[f.fid];

						this.clickedInfo.features.push(f);

						if( featureInfo.clicked ) {
							f.isClicked = true;
							f.n2_selected = true;
						};

						if( featureInfo.intent ) {
							f.n2SelectIntent = featureInfo.intent;
						};
					} else {
						f.n2_selected = false;
					};
					if( this.focusInfo.fids[f.fid] ){
						this.focusInfo.features.push(f);
						f.isHovered = true;
						f.n2_hovered = true;
					} else {
						f.n2_hovered = false;
					};
					if( this.findFeatureInfo.fid === f.fid ){
						this.findFeatureInfo.features.push(f);
						f.n2Intent = 'find';
						f.n2_found = true;
					} else {
						f.n2_found = false;
					};
					
					//Deal with cluster feature n2_ tags
					
					let featuresInCluster = f.cluster;
					if( featuresInCluster && Array.isArray(featuresInCluster) ){
						for(let j=0,k=featuresInCluster.length; j<k; ++j){
							let clusterFeature = featuresInCluster[j];
							let featureInfo = this.clickedInfo.fids[clusterFeature.fid];
							
							if( featureInfo ){
								this.clickedInfo.features.push(f);
								if( clusterFeature.isClicked || featureInfo.clicked ) {
									f.isClicked = true;
									f.n2_selected = true;
								} else {
									f.n2_selected = false;
								};
								if( featureInfo.intent ) {
									f.n2SelectIntent = featureInfo.intent;
								};
							};
							if( this.focusInfo.fids[clusterFeature.fid] ){
								this.focusInfo.features.push(f);
								f.isHovered = true;
								f.n2_hovered = true;
							} else {
								f.n2_hovered = false;
							};
							if( this.findFeatureInfo.fid === clusterFeature.fid ){
								this.findFeatureInfo.features.push(f);
								f.n2Intent = 'find';
								f.n2_found = true;
							} else {
								f.n2_found = false;
							};
						};
					};
					
					//Deal with _n2Type tag
					var geomType = f.getGeometry()._n2Type;
					if ( !geomType ) {
						if ( f
								.getGeometry()
								.getType()
								.indexOf('Line') >= 0){
							geomType = f.getGeometry()._n2Type = 'line';
							
						} else if ( f
									.getGeometry()
									.getType()
									.indexOf('Polygon') >= 0){
							geomType = f.getGeometry()._n2Type = 'polygon';
						} else {
							geomType = f.getGeometry()._n2Type = 'point';
						}
					}
					f.n2_geometry = geomType;
					
					//Deal with n2_doc tag
					var data = f.data;
					if (f 
						&& f.cluster
						&& f.cluster.length === 1) {
						data = f.cluster[0].data;
					};
					f.n2_doc = data;
					
					this.features_.push(f);
				};
			};

	}
	
	_handleDispatch(m){
		var _this = this;

		var type = m.type;
		if( 'focusOn' === type ) {
			if( m.docId ){
				this._startFocus([m.docId]);
			} else if( m.docIds ){
				this._startFocus(m.docIds);
			};
			
		} else if( 'focusOff' === type ) {
			this._endFocus();
			
		} else if( 'focusOnSupplement' === type ) {
			var fid = m.docId;
			
			// Check if this is still valid
			var valid = true;
			if( m.origin ){
				valid = false;
				if( this.focusInfo 
				 && this.focusInfo.origin
				 && this.focusInfo.origin[m.origin] ){
					valid = true;
				};
			};
			
			if( fid && valid ) {
				this._addFocus({
					fids: [fid]
					,intent: m.intent
				});
			};
			
		} else if( 'selected' === type ) {
			if( m.docId ) {
				let fidmap = {};
				fidmap[m.docId] = true
				let features = this._getMapFeaturesIncludeingFidMapOl5(fidmap);
				this._selectedFeatures(features, [m.docId]);
				
			} else if( m.docIds ) {
				let fidmap = {};
				m.docIds.forEach(function(id){
					fidmap[id] = true;
				})
				var features = this._getMapFeaturesIncludeingFidMapOl5(fidmap);
				this._selectedFeatures(features, m.docIds);
			};
			
		} else if( 'selectedSupplement' === type ) {
			let fid = m.docId;
			if( fid ) {
				let fidmap = {};
				fidmap[fid] = true;
				var features = this._getMapFeaturesIncludeingFidMapOl5(fidmap);
				this._selectedFeaturesSupplement({
					fid: fid
					,features: features
					,intent: m.intent
				});
			};
			
		}  else if( 'unselected' === type ) {
			this._endClicked();
			
		}
	}
	

	
	_dispatch(m){
		var dispatcher = this.dispatchService;
		if( dispatcher ) {
			dispatcher.send(DH,m);
		};
	}
}
 export default N2SourceWithN2Intent;
