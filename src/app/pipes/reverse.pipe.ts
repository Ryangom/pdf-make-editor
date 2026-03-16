import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'reverseArr', standalone: true })
export class ReversePipe implements PipeTransform {
  transform<T>(arr: T[]): T[] {
    return [...arr].reverse();
  }
}
