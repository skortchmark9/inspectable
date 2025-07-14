import { ChecklistDefinition } from '../types/checklist';

export const PRE_INSPECTION_CHECKLIST: ChecklistDefinition = {
  id: 'pre_inspection',
  name: 'Pre-Inspection Report',
  categories: [
    {
      id: 'hvac',
      name: 'HVAC',
      keywords: ['furnace', 'thermostat', 'ductwork', 'air handler', 'condenser', 'wiring', 'gas meter', 'electric meter']
    },
    {
      id: 'heat_pump_hot_water',
      name: 'Heat Pump Domestic Hot Water',
      keywords: ['water heater', 'heat pump', 'hot water', 'plumbing']
    },
    {
      id: 'fuel_switching',
      name: 'Fuel Switching',
      keywords: ['dryer', 'stove', 'oven', 'kitchen', 'gas meter', 'electric meter', 'range hood', 'fridge', 'dishwasher']
    },
    {
      id: 'electrical_make_ready',
      name: 'Electric Make-Ready',
      keywords: ['electrical outlet', 'wiring', 'electric meter', 'smoke detector', 'breaker box', 'electrical panel']
    },
    {
      id: 'decommissioning',
      name: 'Decommissioning Make-Ready',
      keywords: ['gas meter']
    },
    {
      id: 'blower_door',
      name: 'Blower Door Test',
      keywords: ['blower door', 'datasheet']
    },
    {
      id: 'weatherization',
      name: 'Weatherization',
      keywords: ['window', 'exterior', 'interior', 'insulation', 'wall', 'hole', 'attic', 'basement - finished', 'basement - unfinished', 'garage', 'living room', 'bathroom']
    },
    {
      id: 'health_safety',
      name: 'Health & Safety',
      keywords: ['smoke detector']
    }
  ]
};

export const DEFAULT_CHECKLIST = PRE_INSPECTION_CHECKLIST;