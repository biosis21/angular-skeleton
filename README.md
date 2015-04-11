# Angular Skeleton

### Table of Contents

- [Required](#required)
- [Dependencies](#dependencies)
- [Installation](#installation)
- [Installing a new third-party library via NPM](#new-with-npm)
- [Installing a new third-party library via Bower](#new-with-bower)

### Requires

- [NodeJS](https://nodejs.org/download/) <NodeJS>
    
### Dependencies 

- [AngularJS](https://angularjs.org/) <angular>
- [AngularUI Router](https://github.com/angular-ui/ui-router) <angular-ui-router>
- [AngularJS Resource](https://github.com/angular/bower-angular-resource) <angular-resource>
- [AngularJS Mocks](https://github.com/angular/angular-mocks) <angular-mocks>
- [RequireJS](http://requirejs.org/) <requirejs>
- [jQuery](http://jquery.com/) <jquery>

### Installation

Install **Gulp** and **Bower**:
    
```bash
   $ npm install -g gulp bower
```

Install all NPM and Bower dependencies:

```bash
   $ npm install && bower install
```

### Installing a new third-party library via NPM

```bash
   $ npm install {--save|--save-dev} <package_name>
```

Learn more information about [install options](https://docs.npmjs.com/files/package.json#local-paths).

All third-party libraries for the client-side development are located in `workspace/scripts/vendors` folder.


### Installing a new third-party library via Bower

```bash
   $ bower install {--save|--save-dev|--production|--force-latest} <package_name>
```

Learn more information about [install options](http://bower.io/docs/api/#install-options). 

All third-party libraries for the client-side development are located in `workspace/scripts/vendors` folder. 
The **.bowerrc** file configures destination folder and [etc](http://bower.io/docs/config/#bowerrc-specificatio).















