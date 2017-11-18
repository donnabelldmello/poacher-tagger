/**
 * Class that represents a region in the image.
 * 
 * @author Venil Noronha
 */
var Cell = function(options) {

	/**
	 * Options, callbacks and cached objects related to the cell.
	 */
	this.options = {
		/** Options. */
		x: options.x, // starting x position
		y: options.y, // starting y position
		w: options.w, // width of the cell
		h: options.h, // height of the cell
		label: options.label, // the current label

		/** Callbacks. */
		isCanvasMode: options.isCanvasMode, // called to check canvas mode
		isCtrlKeyPressed: options.isCtrlKeyPressed, // called to check if ctrl key was pressed
		isShiftKeyPressed: options.isShiftKeyPressed, // called to check if shift key was pressed
		setCanvasMode: options.setCanvasMode, // called to set the new canvas mode
		onUpdate: options.onUpdate, // called when cell is updated
		onDelete: options.onDelete, // called when cell is deleted
		removeFromSelection: options.removeFromSelection, // called when cell is unselected
		addToSelection: options.addToSelection, // called when cell is selected
		removeTemporaryCell: options.removeTemporaryCell, // called when the temporary cell is to be removed
		nextLabel: options.nextLabel, // called to get the next label
		canvasOffset: options.canvasOffset, // called to get the current canvas offset

		/** Cached objects. */
		div: null, // the rendered DIV
	};

	/**
	 * Creates or returns a DIV representing the cell. This method also binds
	 * the necessary events to the cell DIV upon creation.
	 */
	this.render = function() {
		if (!this.options.div) {
			this.options.div =
				$('<div/>')
					.addClass('overlay-cell')
					.addClass('draggable-cell')
					.attr('id', 'cell-' + Math.floor(Math.random() * 1000000000))
					.data('cellObj', this)
					.css('left', this.options.x + 'px')
					.css('top', this.options.y + 'px')
					.css('width', this.options.w)
					.css('height', this.options.h)
					.css('background-color', this.options.label.color)
					.css('position', 'absolute')
					.css('z-index', 999);
			this._bindEvents();
			this.options.onUpdate(this);
		}
		return this.options.div;
	};

	/**
	 * Binds necessary events to the rendered cell DIV.
	 */
	this._bindEvents = function() {
		var _this = this;
		this.options.div

			// Make the cell draggable
			.draggable({
				containment: 'parent',
				start: function() {
					_this.options.setCanvasMode(Mode.DRAGGING);
					_this.options.removeTemporaryCell(); // Remove the tiny temporary cell
				},
				stop: function() {
					_this._updatePosition();
			        setTimeout(function() {
			        	_this.options.setCanvasMode(Mode.IDLE); // Prevent immediate color switch by introducing delay
			        }, 100);
				}
			})

			// Cell click events
			.click(function(e) {
				if (_this.options.isCanvasMode(Mode.DRAGGING)) {
					return;
				}
				if (_this.options.isCtrlKeyPressed()) { // Toggle cell selection
					_this._toggleSelection();
				}
				else if (_this.options.isShiftKeyPressed()) { // Delete the cell
					_this.delete();
				}
				else { // Set the next label
					_this.options.label = _this.options.nextLabel(_this.options.label.name);
					_this._highlightCell();
					_this.options.onUpdate(_this);
				}
			});
	};

	/**
	 * Deletes the cell.
	 */
	this._deleteState = function() {
		this.options.label = null;
		this.options.div.remove();
	};

	/**
	 * Highlights the cell according to current label.
	 */
	this._highlightCell = function() {
		var label = this.options.label;
		if (!label) {
			this.options.div.css('background-color', '');
		}
		else {
			this.options.div.css('background-color', label.color);
		}
	};

	/**
	 * Updates the cell position in the model, and calls the callback function.
	 */
	this._updatePosition = function() {
		var offset = this.options.canvasOffset();
		var elOffset = this.options.div.offset();
        var newStartX = elOffset.left - offset.left;
        var newStartY = elOffset.top - offset.top;

        // Reset
        var label = this.options.label;
		this.options.label = null;
		this.options.onUpdate(this);

		// Update modifiedboxes
		var bbox = this.options.x +"," +this.options.y +"," +this.options.w +"," +this.options.h;
		app.options.canvas.options.modifiedBBoxes.delete(bbox);

		// Update
		this.options.x = newStartX;
		this.options.y = newStartY;
		this.options.label = label;
		this.options.onUpdate(this);
		
		// Update modified bounging boxes on cell update (like moving box)
		if(app.options.visited[app.options.frameIndex+1] == undefined) {
			bbox = this.options.x +"," +this.options.y +"," +this.options.w +"," +this.options.h;
			app.options.canvas.options.modifiedBBoxes.add(bbox);
		}
	};

	/**
	 * Toggles the cell to within group/outside group.
	 */
	this._toggleSelection = function() {
		if (this.options.div.hasClass('selected-cell')) {
			this.options.div.removeClass('selected-cell');
			this.options.removeFromSelection(this);
		}
		else {
			this.options.div.addClass('selected-cell');
			this.options.addToSelection(this);
		}
	};

	/**
	 * Deletes the cell and notifies the callback.
	 */
	this.delete = function() {
		this._deleteState();
		this._highlightCell();
		this.options.onDelete(this);
	};

};
