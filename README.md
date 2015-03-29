# Angular Skeleton

### Table of Contents

- [Required](#required)
- [Dependencies](#dependencies)
- [Installation](#installation)
- [Installing a new third-party library via NPM](#new-with-npm)
- [Installing a new third-party library via Bower](#new-with-bower)

### Required

- [NodeJS](https://nodejs.org/download/) <NodeJS>
    
### Dependencies 

- [AngularJS](https://angularjs.org/) <angular>
- [AngularUI Router](https://github.com/angular-ui/ui-router) <angular-ui-router>
- [AngularJS Resource](https://github.com/angular/bower-angular-resource) <angular-resource>
- [AngularJS Mocks](https://github.com/angular/angular-mocks) <angular-mocks>
- [RequireJS](http://requirejs.org/) <requirejs>
- [jQuery](http://jquery.com/) <jquery>

### Installation

Install **Gulp**:
    
```bash
   $ npm install -g gulp
```
   
Install **Bower** and configure it:
    
```bash  
   $ npm install -g bower && bower init
```

Install all NPM dependencies:

```bash
   $ npm install
```

### <a href="#new-with-npm">Installing a new third-party library via NPM</a>

```bash
   $ npm install {--save|--save-dev} <package_name>
```

Learn more information about [install options](https://docs.npmjs.com/files/package.json#local-paths).

All third-party libraries for the client-side development are located in `workspace/scripts/vendors` folder.


### <a href="#new-with-bower">Installing a new third-party library via Bower</a>

```bash
   $ bower install {--save|--save-dev|--production|--force-latest} <package_name>
```

Learn more information about [install options](http://bower.io/docs/api/#install-options). 

All third-party libraries for the client-side development are located in `workspace/scripts/vendors` folder. 
The **.bowerrc** file configures destination folder and [etc](http://bower.io/docs/config/#bowerrc-specificatio).















