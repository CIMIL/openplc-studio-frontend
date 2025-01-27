import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModuleType } from '../enums/module-type.enum';
import { Module } from '../interfaces/module.interface';
import { ModuleParameters } from '../interfaces/module-parameters.interface';

@Injectable({
  providedIn: 'root',
})
export class ModulesService {
  private api: string = '/api/modules';
  private headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  constructor(private http: HttpClient) {}

  public getModuleTypes(moduleType: ModuleType): Observable<Module[]> {
    let params = new HttpParams();

    params = params.set('module_type', moduleType);

    return this.http.get<Module[]>(this.api, { headers: this.headers, params: params });
  }
  public getModuleParams(moduleType: ModuleType, module: string): Observable<ModuleParameters[]> {
    let params = new HttpParams();

    params = params.set('module_name', module);

    const endpoint = `${this.api}/${moduleType}/parameters`;

    return this.http.get<ModuleParameters[]>(endpoint, { headers: this.headers, params: params });
  }
}
