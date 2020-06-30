import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerExists = await this.customersRepository.findById(customer_id);

    if (!customerExists) {
      throw new AppError('not does exist customer');
    }

    const productExists = await this.productsRepository.findAllById(products);

    if (!productExists.length) {
      throw new AppError('not does exist products');
    }

    const quantityBody = products.map(prod => prod.quantity);
    const quantitExist = productExists.map(product => product.quantity);

    if (quantityBody[0] > quantitExist[0]) {
      throw new AppError('dont have quantity');
    }

    const sub = quantitExist[0] - quantityBody[0];


    const format = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: productExists.filter(p => p.id === product.id)[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer: customerExists,
      products: format,
    });

    const update = products.map(product => ({
      id: product.id,
      quantity: sub,
    }));

    await this.productsRepository.updateQuantity(update);
    return order;
  }
}

export default CreateProductService;
