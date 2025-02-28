import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModuleType } from '../enums/module-type.enum';
import { Module } from '../interfaces/module.interface';
import { ModuleParameters } from '../interfaces/module-parameters.interface';
import { Run } from '../interfaces/run.interface';

@Injectable({
  providedIn: 'root',
})
export class RunsClient {
  private api: string = '/api/runs';
  private headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  constructor(private http: HttpClient) {}

  public createRun(run: Run): Observable<Run> {
    return this.http.post<Run>(this.api, run, { headers: this.headers });
  }
}
