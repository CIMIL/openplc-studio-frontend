import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FilesClient {
  private _api = '/api/files';

  get api(): string {
    return this._api;
  }

  constructor(private http: HttpClient) {}

  public uploadFiles(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return this.http.post(`${this.api}`, formData);
  }

  public getFilenames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/names`);
  }
}
