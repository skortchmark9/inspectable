import { ChecklistDefinition } from '../types/checklist';

export const PRE_INSPECTION_CHECKLIST: ChecklistDefinition = {
  id: 'pre_inspection',
  name: 'Pre-Inspection Report',
  categories: [
    {
      id: 'hvac',
      name: 'HVAC',
      keywords: ['furnace', 'thermostat', 'ductwork', 'air handler', 'condenser', 'wiring', 'gas meter', 'electric meter'],
      specificItems: [
        { id: 'central_air_label', name: 'Central Air Unit Label', keywords: ['furnace', 'label'], required: true },
        { id: 'unit_exterior_wall', name: 'Unit Against Exterior Wall', keywords: ['furnace', 'exterior'], required: true },
        { id: 'ductwork_photos', name: 'Ductwork Photos', keywords: ['ductwork'], required: true },
        { id: 'thermostat_photo', name: 'Thermostat Photo', keywords: ['thermostat'], required: false }
      ]
    },
    {
      id: 'heat_pump_hot_water',
      name: 'Heat Pump Domestic Hot Water',
      keywords: ['water heater', 'heat pump', 'hot water', 'plumbing'],
      specificItems: [
        { id: 'water_heater_full', name: 'Photo of Whole Water Heater', keywords: ['water heater'], required: true },
        { id: 'water_heater_label', name: 'Photo of Water Heater Label', keywords: ['water heater', 'label'], required: true }
      ]
    },
    {
      id: 'fuel_switching',
      name: 'Fuel Switching',
      keywords: ['dryer', 'stove', 'oven', 'kitchen', 'gas meter', 'electric meter', 'range hood', 'fridge', 'dishwasher'],
      specificItems: [
        { id: 'kitchen_photo', name: 'Photo of Kitchen', keywords: ['kitchen'], required: true },
        { id: 'dryer_photo', name: 'Photo of Dryer', keywords: ['dryer'], required: true },
        { id: 'oven_photo', name: 'Photo of Oven', keywords: ['oven'], required: false },
        { id: 'breaker_panel', name: 'Breaker Panel', keywords: ['breaker', 'electrical panel'], required: true }
      ]
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