import { Metadata } from 'next';
import CatalogClient from './CatalogClient';

export const metadata: Metadata = {
  title: 'Catálogo de Agentes - Alfabra-Vector',
  description: 'Gestão de pacotes de governança de agentes',
};

export default function CatalogPage() {
  return <CatalogClient />;
}
