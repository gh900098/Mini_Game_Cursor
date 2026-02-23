import { Controller, Get, Query } from '@nestjs/common';
import { RouteService } from './route.service';

@Controller('route')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get('getUserRoutes')
  getUserRoutes() {
    return this.routeService.getUserRoutes();
  }

  @Get('getConstantRoutes')
  getConstantRoutes() {
    return this.routeService.getConstantRoutes();
  }

  @Get('isRouteExist')
  isRouteExist(@Query('routeName') routeName: string) {
    return this.routeService.isRouteExist(routeName);
  }
}
