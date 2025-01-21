import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModuleType } from '../enums/module-type.enum';

@Injectable({
  providedIn: 'root',
})
export class ModulesService {
  private api: string = 'http://localhost:8000/modules';
  private headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  constructor(private http: HttpClient) {}

  public getModuleTypes(moduleType: ModuleType): Observable<string[]> {
    let params = new HttpParams();

    params = params.set('module_type', moduleType);

    return this.http.get<string[]>(this.api, { headers: this.headers, params: params });
  }
}
