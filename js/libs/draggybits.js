(function($) {

  var pluginName = 'draggyBits';
  var movingClass = 'ui-moving';
  var draggerClass = 'ui-dragger';
  var closerClass = 'ui-closer';
  var minimizeClass = 'ui-hider';
  var hiddenClass = 'ui-hidden';

  var isMoving = false;
  var zIndex = 100;
  var pos = { x:0, y:0 };
  var numDraggers = 0;
  var tileOffset = { x:20, y:20 };

  var $current;
  var $window = $(window);

  var defaults = {
    onMinimize : function (e) { return false; },
    onInit : function (e) { return false; },
    onClose : function (e) { return false; },
    onRestore : function (e) { return false; }
  };

  // We aren't using *all* of these keycodes yet, but they sure are handy
  var keyCodes = {
    DOWN : 40,
    END : 35,
    ENTER : 13,
    ESCAPE : 27,
    HOME : 36,
    LEFT : 37,
    PAGE_DOWN : 34,
    PAGE_UP : 33,
    RIGHT : 39,
    SPACE : 32,
    TAB : 9,
    UP : 38
  };

  var methods = {

    init : function (opts) {
      
      return this.each(function() {    
      
        var $this = $(this).addClass(pluginName);
        var $dragger = $this.find('.' + draggerClass);
        var $closer = $this.find('.' + closerClass).click(onCloseClick);
        var $minimizer = $this.find('.' + minimizeClass).click(onMinimizeClick);

        var options = $.extend(defaults, opts);

        var data = {
          $this : $this,
          $dragger : $dragger,
          $closer : $closer,
          $minimizer : $minimizer,
          onMinimize : options.onMinimize,
          onClose : options.onClose,
          onInit : options.onInit,
          onRestore : options.onRestore
        };

        $this.data(pluginName, data);

        $dragger.attr('aria-grabbed', false);

        // If there isn't a tabindex, set one on the dragger in order to ensure
        // focusability, even for not-normally focusable elements
        if (!$dragger.attr('tabindex')) {
          $dragger.attr('tabindex', '0');
        }

        numDraggers++;

        var css = {
          top : numDraggers * tileOffset.y,
          left : 200 + (numDraggers * tileOffset.x),
          position : 'absolute'
        };

        $this.css(css);
        
        options.onInit($this);
      }); 
    },

    minimize : function () {
      var $this = $(this).addClass(hiddenClass);
      var data = $this.data(pluginName);
      data.onMinimize($this);
    },

    restore : function () {
      var $this = $(this).removeClass(hiddenClass).css("z-index", zIndex++);
      var data = $this.data(pluginName);      
      data.onRestore($this);
    },

    close : function () {
      var $this = $(this);
      var data = $this.data(pluginName);      
      data.onClose($this);
      $this.remove();
    }

  };




    /*** MODULE DEFINITION ***/

    $.fn[pluginName] = function (method) {
        if ( methods[method] ) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this,arguments);
        } else {
            $.error('Method ' + method + ' does not exist');
        }
    };  




    /*** EVENTS HANDLERS ***/

  var onMove = function (e) {
    var curr = { x: e.pageX, y: e.pageY };

    var dx = curr.x - pos.x;
    var dy = curr.y - pos.y;

    $current.css({top:"+="+dy, left:"+="+dx});

    pos = curr;
  };

  var onMouseUp = function (e) {
    var $this = $(e.target);

    if (!isMoving) {
      return;
    }

    $this.attr('aria-grabbed', false);
    $('.' + movingClass).removeClass(movingClass);

    $window.off('mousemove');
    isMoving = false;
    
    // touch
    window.removeEventListener('touchmove', onMove, false);
  };

  var onMouseDown = function (e) {
    var $this = $(e.target);
    var isDragger = $this.hasClass(draggerClass);
    
    $this.parents('.'+ pluginName).css("z-index", zIndex++);

    if (!isDragger) {
      return;
    }

    e.preventDefault();
    pos = { x: e.pageX, y: e.pageY };

    $this.attr('aria-grabbed', true);
    $current = $this.parents('.'+ pluginName).addClass(movingClass);
    $window.on('mousemove', onMove);

    isMoving = true;
    
    // touch
    window.addEventListener('touchmove', onMove, false);
  };

  var onCloseClick = function (e) {
    var $this = $(this);
    var $par = $this.parents('.'+ pluginName);
      $par[pluginName]('close');
  };

  // Some of this logic is duplicative of onMouseDown/onMouseUp,
  // but given that we don't have pageX/pageY, reuse of the other
  // events proves difficult.
  var onKeyDown = function (e) {
    var $this = $(e.target);
    var isDragger = $this.hasClass(draggerClass);

    // How much to move when hitting various directions
    // Shift causes large movements, Control causes small ones
    // Control+Shift is treated like Control
    // lol alt/cmd
    var moveAmount = 10;
    if (e.shiftKey) { moveAmount = 100; }
    if (e.ctrlKey) { moveAmount = 1; }

    var movePos;

    // Only care about key events on draggers
    if (!isDragger) {
      return;
    }

    $current = $this.parents('.'+ pluginName);

    switch (e.keyCode) {
      // Intentional fall-through so that both spacebar and enter
      // act as activation keys
      case keyCodes.SPACE:
      case keyCodes.ENTER:
        e.preventDefault();

        $current.css("z-index", zIndex++);

        isMoving = !isMoving;
        $this.attr('aria-grabbed', isMoving);
        $current.toggleClass(movingClass, isMoving);
        break;

      case keyCodes.TAB:
        // Tabbing will automatically let go of the control and move on
        isMoving = false;
        $this.attr('aria-grabbed', isMoving);
        $current.removeClass(movingClass);
        break;

      // For various up/down/left/right maneuvers, only move when grabbed.
      // Lots of duplicated code, but hard to clean up in a way that is still
      // readable/maintainable.
      case keyCodes.UP:
        if (!isMoving) { return; }
        e.preventDefault();
        movePos = { top : "-=" + moveAmount };
        break;
      case keyCodes.DOWN:
        if (!isMoving) { return; }
        e.preventDefault();
        movePos = { top : "+=" + moveAmount };
        break;
      case keyCodes.LEFT:
        if (!isMoving) { return; }
        e.preventDefault();
        movePos = { left : "-=" + moveAmount };
        break;
      case keyCodes.RIGHT:
        if (!isMoving) { return; }
        e.preventDefault();
        movePos = { left : "+=" + moveAmount };
        break;

      default:
        // We obvs don't care about this key, get out
        return;
    }

    // If we have a move value, apply it now
    if (movePos) {
      // Move as appropriate
      $current.css(movePos);

      // If our top or left went negative, move back to 0,
      // to keep us from going off-screen too hard.
      if (parseInt($current.css('top'), 10) < 0)  { $current.css('top', '0');  }
      if (parseInt($current.css('left'), 10) < 0) { $current.css('left', '0'); }
    }

  };

  var onMinimizeClick = function (e) {
    var $this = $(this);
    var $par = $this.parents('.'+ pluginName);
      $par[pluginName]('minimize');
  };

  /*** GLOBAL EVENTS ***/

  $(window).mousedown(onMouseDown).mouseup(onMouseUp);
  
  // touch
  window.addEventListener('touchstart', onMouseDown, false);
  window.addEventListener('touchend', onMouseUp, false);
  window.addEventListener('keydown', onKeyDown, false);

})( jQuery );
