import { Routes } from '@angular/router';
import { CameraDenuncia } from './camera/camera';

export const routes: Routes = [
    { path: '', component: CameraDenuncia },
    { path: '**', redirectTo: '' },
];