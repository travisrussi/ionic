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

.controller('NavCtrl', ['$scope', '$element', '$animate', '$compile', 'TemplateLoader', 'Platform', function($scope, $element, $animate, $compile, TemplateLoader, Platform) {
  var _this = this;

  angular.extend(this, ionic.controllers.NavController.prototype);

  /**
   * Push a template onto the navigation stack.
   * @param {string} templateUrl the URL of the template to load.
   */
  this.pushFromTemplate = ionic.throttle(function(templateUrl) {
    var childScope = $scope.$new();
    childScope.isVisible = true;

    // Load the given template
    TemplateLoader.load(templateUrl).then(function(templateString) {

      // Compile the template with the new scrope, and append it to the navigation's content area
      var el = $compile(templateString)(childScope, function(cloned, scope) {
        //var content = angular.element($element[0].querySelector('.content, .scroll'));
        cloned.addClass(childScope.pushAnimation);
        $animate.enter(cloned, angular.element($element));
      });
    });
  }, 300, {
    trailing: false
  });

  // Pop function, throttled
  this.popController = ionic.throttle(function() {
    _this.pop();
    $scope.$broadcast('navigation.pop');
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
    _this.push(scope);
    $scope.$broadcast('navigation.push', scope);
  };

  this.pushController = function(scope) {
    _this.push(scope);
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
      first: '@'
    },
    link: function($scope, $element, $attr, navCtrl) {
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

  // We need to animate the new controller into view.
  var animatePushedController = function(childScope, clone, $element, isForward) {
    var parent = angular.element($element.parent().parent().parent());
    
    var title = angular.element(parent[0].querySelector('.title'));

    // Clone the old title and insert it so we can animate it back into place for the new controller
    var newTitle = angular.element(title.clone());
    $compile(newTitle)(childScope);
    title.after(newTitle);
    // Grab the button so we can slide it in
    var button = angular.element(parent[0].querySelector('.button'));

    if(isForward) {

      // Slide the button in
      $animate.addClass(button, childScope.slideButtonInAnimation, function() {
        $animate.removeClass(button, childScope.slideButtonInAnimation, function() {});
      })

      // Slide the new title in
      $animate.addClass(newTitle, childScope.slideTitleInAnimation, function() {
        $animate.removeClass(newTitle, childScope.slideTitleInAnimation, function() {
          newTitle.scope().$destroy();
          newTitle.remove();
        });
      });

      // Grab the old title and slide it out
      var title = $element.parent().parent().parent()[0].querySelector('.title');
      $animate.addClass(angular.element(title), childScope.slideTitleOutAnimation, function() {
        $animate.removeClass(angular.element(title), childScope.slideTitleOutAnimation, function() {
        });
      });
    } else {
      clone.addClass(childScope.slideBackInAnimation);
    }
  };

  return {
    restrict: 'E',
    require: '^navigation',
    transclude: true,
    replace: true,
    template: '<div class="pane" ng-transclude></div>',
    scope: {
      title: '='
    },
    compile: function(element, attr, transclude) {
      return function($scope, $element, $attr, navCtrl) {
        var lastParent, lastIndex, childScope, childElement;

        // Store that we should go forwards on the animation. This toggles
        // based on the visibility sequence (to support reverse transitions)
        var lastDirection = null;

        $scope.$watch('title', function(value) {
          //$scope.parent.headerBarView.align();
        });

        /*
        $scope.title = $attr.title;
        $scope.pushAnimation = $attr.pushAnimation || 'slide-in-left';
        $scope.popAnimation = $attr.popAnimation || 'slide-in-right';
        $scope.slideTitleInAnimation = $attr.slideTitleInAnimation || 'bar-title-in';
        $scope.slideTitleOutAnimation = $attr.slideTitleOutAnimation || 'bar-title-out';
        $scope.slideButtonInAnimation = $attr.slideButtonInAnimation || 'bar-button-in';
        $scope.slideButtonOutAnimation = $attr.slideButtonOutAnimation || 'bar-button-out';
        */

        if($attr.navBar === "false") {
          navCtrl.hideNavBar();
        } else {
          navCtrl.showNavBar();
        }

        $scope.visibilityChanged = function(direction) {
          lastDirection = direction;

          if($scope.isVisible) {
            $scope.$broadcast('navContent.shown');
          } else {
            $scope.$broadcast('navContent.hidden');
          }

          if(!childElement) {
            return;
          }

          var clone = childElement;

          if(direction == 'push') {
            clone.addClass(childScope.pushAnimation);
            clone.removeClass(childScope.popAnimation);
          } else if(direction == 'pop') {
            clone.addClass(childScope.popAnimation);
            clone.removeClass(childScope.pushAnimation);
          }
        };

        // Push this controller onto the stack
        navCtrl.pushController($scope, $element);

        $scope.$watch('isVisible', function(value) {

          if(value) {
            childScope = $scope.$new();

            transclude(childScope, function(clone) {
              childElement = clone;

              if(lastDirection == 'push') {
                clone.addClass(childScope.pushAnimation);
              } else if(lastDirection == 'pop') {
                clone.addClass(childScope.popAnimation);
              }

              $animate.enter(clone, $element.parent(), $element, function() {
                clone.removeClass(childScope.pushAnimation);
                clone.removeClass(childScope.popAnimation);
              });
            });
          } else {
            // Taken from ngIf
            if(childElement) {
              // Check if this is visible, and if so, create it and show it
              $animate.leave(childElement, function() {
                if(childScope) {
                  childElement.removeClass(childScope.pushAnimation);
                  childElement.removeClass(childScope.popAnimation);
                }
              });
              childElement = undefined;
            }
            if(childScope) {
              childScope.$destroy();
              childScope = undefined;
            }
          }
        });
      }
    }
  };
}])


.directive('navPush', function() {
  return {
    restrict: 'A',
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
