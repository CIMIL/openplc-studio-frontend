import { Confirmation } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { TrackUploadComponent } from './track-upload.component';

describe('TrackUploadComponent', () => {
  let assetsClient: jasmine.SpyObj<any>;
  let confirmationService: jasmine.SpyObj<any>;
  let messageService: jasmine.SpyObj<any>;
  let component: TrackUploadComponent;

  beforeEach(() => {
    assetsClient = jasmine.createSpyObj('AssetsClient', ['getFilenames', 'uploadTrack']);
    confirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    messageService = jasmine.createSpyObj('MessageService', ['add']);
    component = new TrackUploadComponent(assetsClient, confirmationService, messageService);
    component.fileUpload = { clear: jasmine.createSpy('clear') } as any;
  });

  it('uploads queued files individually', async () => {
    const first = new File(['first'], 'first.wav', { type: 'audio/wav' });
    const second = new File(['second'], 'second.wav', { type: 'audio/wav' });
    assetsClient.getFilenames.and.returnValue(of([]));
    assetsClient.uploadTrack.and.returnValue(of({}));
    const uploaded = jasmine.createSpy('uploaded');
    component.uploaded.subscribe(uploaded);

    await component.upload({ files: [first, second] });

    expect(assetsClient.uploadTrack.calls.allArgs()).toEqual([
      [first, false, jasmine.any(Function)],
      [second, false, jasmine.any(Function)],
    ]);
    expect(uploaded).toHaveBeenCalledOnceWith(['first.wav', 'second.wav']);
    expect(component.fileUpload.clear).toHaveBeenCalled();
  });

  it('tracks progress by file identity when files share metadata', async () => {
    const first = new File(['audio'], 'same.wav', { lastModified: 1 });
    const second = new File(['audio'], 'same.wav', { lastModified: 1 });
    const pending = new Subject<any>();
    assetsClient.getFilenames.and.returnValue(of([]));
    assetsClient.uploadTrack.and.returnValues(pending.asObservable(), of({}));

    const upload = component.upload({ files: [first, second] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const reportProgress = assetsClient.uploadTrack.calls.first().args[2] as (progress: number) => void;
    reportProgress(42);

    expect(component.getUploadProgress(first)).toBe(42);
    expect(component.getUploadProgress(second)).toBeNull();
    pending.next({});
    await upload;
  });

  it('asks before overwriting existing filenames', async () => {
    const file = new File(['replacement'], 'existing.wav', { type: 'audio/wav' });
    assetsClient.getFilenames.and.returnValue(of(['existing.wav']));
    assetsClient.uploadTrack.and.returnValue(of({}));
    confirmationService.confirm.and.callFake((confirmation: Confirmation) => confirmation.accept?.());

    await component.upload({ files: [file] });

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(assetsClient.uploadTrack).toHaveBeenCalledOnceWith(file, true, jasmine.any(Function));
  });
});
