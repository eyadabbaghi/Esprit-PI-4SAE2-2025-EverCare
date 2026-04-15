// badge.component.ts
import { Component, Input, HostBinding, ElementRef, Renderer2, OnInit } from '@angular/core';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

@Component({
  selector: 'span[appBadge], a[appBadge]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      width: fit-content;
      white-space: nowrap;
      flex-shrink: 0;
      gap: 0.25rem;
      transition: color 150ms, box-shadow 150ms;
      overflow: hidden;
      border: 1px solid transparent;
    }

    :host:focus-visible {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    :host[aria-invalid="true"] {
      border-color: #ef4444;
    }

    /* Variants */
    :host([data-variant="default"]) {
      background: #0f172a;
      color: white;
    }

    :host([data-variant="secondary"]) {
      background: #f1f5f9;
      color: #0f172a;
    }

    :host([data-variant="destructive"]) {
      background: #ef4444;
      color: white;
    }

    :host([data-variant="outline"]) {
      background: transparent;
      color: #0f172a;
      border-color: #e2e8f0;
    }

    /* Hover states for anchor tags */
    a[data-variant="default"]:hover {
      background: #0f172a ;
    }

    a[data-variant="secondary"]:hover {
      background: #f1f5f9 ;
    }

    a[data-variant="destructive"]:hover {
      background: #ef4444 ;
    }

    a[data-variant="outline"]:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* SVG styles */
    :host ::ng-deep svg {
      width: 0.75rem;
      height: 0.75rem;
      pointer-events: none;
      flex-shrink: 0;
    }
  `]
})
export class BadgeComponent implements OnInit {
  @Input() variant: BadgeVariant = 'default';
  @Input() asChild: boolean = false;

  @HostBinding('attr.data-variant')
  get variantAttr() {
    return this.variant;
  }

  @HostBinding('attr.data-slot')
  get dataSlot() {
    return 'badge';
  }

  @HostBinding('class')
  @Input() className: string = '';

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    // Si asChild est true, on applique les propriétés à l'élément enfant
    if (this.asChild && this.elementRef.nativeElement.children.length > 0) {
      const child = this.elementRef.nativeElement.children[0];

      // Copier les classes et attributs du parent vers l'enfant
      const parentClasses = this.elementRef.nativeElement.className;
      const parentVariant = this.elementRef.nativeElement.getAttribute('data-variant');

      this.renderer.setAttribute(child, 'data-variant', parentVariant);
      this.renderer.setAttribute(child, 'data-slot', 'badge');

      // Ajouter les classes Tailwind à l'enfant
      const badgeClasses = this.getBadgeClasses();
      child.className = `${child.className} ${badgeClasses}`;

      // Masquer l'élément parent
      this.renderer.setStyle(this.elementRef.nativeElement, 'display', 'none');
    }
  }

  private getBadgeClasses(): string {
    const baseClasses = 'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden';

    const variantClasses = {
      default: 'border-transparent bg-[#0f172a] text-white',
      secondary: 'border-transparent bg-[#f1f5f9] text-[#0f172a]',
      destructive: 'border-transparent bg-[#ef4444] text-white',
      outline: 'border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]'
    };

    return `${baseClasses} ${variantClasses[this.variant]}`;
  }
}
