(function() {
'use strict';

/**
 * @description
 * The NavController is a navigation stack View Controller modelled off of 
 * UINavigationController from Cocoa Touch. With the Nav Controller, you can
 * "push" new "pages" on to the navigation stack, and then pop them off to go
 * back. The NavController controls a navigation bar with a back button and title
 * which updates as the pages switch.
 *
 */
angular.module('ionic.ui.nav', ['ionic.service.templateLoad', 'ionic.service.gesture', 'ionic.service.platform', 'ngAnimate'])

.controller('NavCtrl', ['$scope', '$element', '$animate', '$compile', '$timeout', 'TemplateLoader', 'Platform', function($scope, $element, $animate, $compile, $timeout, TemplateLoader, Platform) {
  var _this = this;

  angular.extend(this, ionic.controllers.NavController.prototype);

  var pushInAnimation = $scope.pushInAnimation || 'slide-in-left';
  var pushOutAnimation = $scope.pushOutAnimation || 'slide-out-left';
  var popInAnimation = $scope.popInAnimation || 'slide-in-right';
  var popOutAnimation = $scope.popOutAnimation || 'slide-out-right';

  var cleanElementAnimations = function(el) {
    el.removeClass(pushInAnimation);
    el.removeClass(pushOutAnimation);
    el.removeClass(popInAnimation);
    el.removeClass(popOutAnimation);
  }

  /**
   * Push a template onto the navigation stack.
   * @param {string} templateUrl the URL of the template to load.
   */
  this.pushFromTemplate = ionic.throttle(function(templateUrl) {
    var childScope = $scope.$new();
    var last = _this.getTopController();

    // Load the given template
    TemplateLoader.load(templateUrl).then(function(templateString) {

      // Compile the template with the new scrope, and append
      // it to the navigation's content area
      var el = $compile(templateString)(childScope, function(cloned, scope) {

        // If there was a last controller, remove it and mark the new
        // one to animate
        if(last) {
          // Push animate
          cleanElementAnimations(last.element);
          $animate.addClass(last.element, pushOutAnimation, function() {
            last.element[0].style.display = 'none';
            last.element.removeClass(pushOutAnimation);
          });

        }


        if(last) {
          // We will need to animate in the new page since we have an old page
          cloned.addClass(pushInAnimation);
          $animate.addClass(cloned, pushInAnimation);
        }

        $animate.enter(cloned, $element, null, function() {
        });

      });
    });
  }, 300, {
    trailing: false
  });

  // Pop function, throttled
  this.popController = ionic.throttle(function() {
    var last = _this.pop();
    $scope.$broadcast('navigation.pop');

    var next = _this.getTopController();

    if(last) {

      cleanElementAnimations(last.element);
      $animate.addClass(last.element, popOutAnimation, function() {
        last.scope.$destroy();
        last.element.remove();
      });
    }

    // Animate the next one in
    if(next) {
      cleanElementAnimations(next.element);
      $animate.addClass(next.element, popInAnimation)
      next.element[0].style.display = 'block';
    }
  }, 300, {
    trailing: false
  });


  ionic.controllers.NavController.call(this, {
    content: {
    },
    navBar: {
      shouldGoBack: function() {
      },
      show: function() {
        this.isVisible = true;
      },
      hide: function() {
        this.isVisible = false;
      },
      setTitle: function(title) {
        $scope.navController.title = title;
      },
      showBackButton: function(show) {
      },
    }
  });

  // Support Android hardware back button (native only, not mobile web)
  var onHardwareBackButton = function(e) {
    $scope.$apply(function() {
      _this.popController();
    });
  }
  Platform.onHardwareBackButton(onHardwareBackButton);


  this.handleDrag = function(e) {
    // TODO: Support dragging between pages
  };

  this.endDrag = function(e) {
  };

  /**
   * Push a controller to the stack. This is called by the child
   * nav-content directive when it is linked to a scope on the page.
   */
  $scope.pushController = function(scope, element) {
    _this.push({
      scope: scope,
      element: element
    });
    $scope.$broadcast('navigation.push', scope);
  };

  this.pushController = function(scope, element) {
    _this.push({
      scope: scope,
      element: element
    });
    $scope.$broadcast('navigation.push', scope);
  };

  $scope.navController = this;

  $scope.$on('$destroy', function() {
    // Remove back button listener
    Platform.offHardwareBackButton(onHardwareBackButton);
  });
}])

/**
 * The main directive for the controller.
 */
.directive('navigation', function() {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    controller: 'NavCtrl',
    //templateUrl: 'ext/angular/tmpl/ionicTabBar.tmpl.html',
    template: '<div class="view" ng-transclude></div>',
    scope: {
      first: '@',
      pushAnimation: '@',
      popAnimation: '@'
    },
    link: function($scope, $element, $attr, navCtrl) {
      $scope.pushAnimation = $scope.pushAnimation || 'slide-in-left';
      $scope.popAnimation = $scope.popAnimation || 'slide-out-left';

      if($scope.first) {
        navCtrl.pushFromTemplate($scope.first);
      }
    }
  };
})

/**
 * Our Nav Bar directive which updates as the controller state changes.
 */
.directive('navBar', function() {
  return {
    restrict: 'E',
    require: '^navigation',
    replace: true,
    scope: {
      type: '@',
      backButtonType: '@',
      alignTitle: '@'
    },
    template: '<header class="bar bar-header nav-bar" ng-class="{hidden: !navController.navBar.isVisible}">' + 
        '<button ng-click="goBack()" class="button" ng-if="navController.controllers.length > 1" ng-class="backButtonType">Back</button>' +
        '<h1 class="title">{{navController.getTopController().title}}</h1>' + 
      '</header>',
    link: function($scope, $element, $attr, navCtrl) {
      var backButton;

      $scope.navController = navCtrl;

      $scope.goBack = function() {
        navCtrl.popController();
      };


      var hb = new ionic.views.HeaderBar({
        el: $element[0],
        alignTitle: $scope.alignTitle || 'center'
      });

      $element.addClass($scope.type);

      $scope.headerBarView = hb;

      $scope.$parent.$on('navigation.push', function() {
        backButton = angular.element($element[0].querySelector('.button'));
        backButton.addClass($scope.backButtonType);
        hb.align();
      });
      $scope.$parent.$on('navigation.pop', function() {
        hb.align();
      });

      $scope.$on('$destroy', function() {
        //
      });
    }
  };
})

.directive('navPage', ['Gesture', '$animate', '$compile', function(Gesture, $animate, $compile) {

  return {
    restrict: 'AC',
    require: '^navigation',
    link: function($scope, $element, $attr, navCtrl) {
      var lastParent, lastIndex, childScope, childElement;

      // Store that we should go forwards on the animation. This toggles
      // based on the visibility sequence (to support reverse transitions)
      var lastDirection = null;

      $scope.title = $attr.title;

      if($attr.navBar === "false") {
        navCtrl.hideNavBar();
      } else {
        navCtrl.showNavBar();
      }

      $scope.$on('$destroy', function() {
        console.log('SCOPE DESTROYED');
        if(childElement) {
          childElement.remove();
        }
      });
    
      // Push this controller onto the stack
      navCtrl.pushController($scope, $element);
    }
  }
}])

.directive('navPush', function() {
  return {
    restrict: 'A',
    require: '^navigation',
    link: function($scope, $element, $attr, navCtrl) {
      var templateUrl = $attr.navPush;

      var pushTemplate = function(e) {
        $scope.$apply(function() {
          $scope.navController.pushFromTemplate(templateUrl);
        });
        return false;
      };

      $element.bind('tap', pushTemplate);

      $scope.$on('$destroy', function() {
        $element.unbind('tap', pushTemplate);
      });
    }
  }
})

.directive('navPop', function() {
  return {
    restrict: 'A',
    require: '^navigation',
    link: function($scope, $element, $attr, navCtrl) {
      var popTemplate = function(e) {
        $scope.$apply(function() {
          $scope.navController.pop();
        });
        return false;
      };

      $element.bind('tap', popTemplate);

      $scope.$on('$destroy', function() {
        $element.unbind('tap', popTemplate);
      });
    }
  }
})

})();
