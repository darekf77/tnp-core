//#region @notForNpm

import { Helpers } from './index';


console.log(Helpers.values({ test: 'testvalue' }))


import { NgModule } from '@angular/core';

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-tnp-core',
  template: `hello`
})

export class TnpCoreComponent implements OnInit {
  constructor() { }

  ngOnInit() { }
}

@NgModule({
  imports: [],
  exports: [TnpCoreComponent],
  declarations: [TnpCoreComponent],
  providers: [],
})
export class TnpCoreModule { }


//#endregion
